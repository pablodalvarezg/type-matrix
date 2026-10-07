import { z } from "zod";

import {
  MAX_EV,
  MAX_EV_TOTAL,
  MAX_IV,
  MAX_LEVEL,
} from "@modules/battle/domain/stats";
import { param, type SearchParams } from "@shared/search-params";

/*
 * The calculator is a GET form, so its input is the URL's search params.
 * Field names are the dotted path of the parsed value ("attacker.ivs.hp"),
 * which makes a Zod issue's path the name of the field it belongs to.
 * A blank or missing field takes the default, like an untouched one.
 */

const blankAsMissing = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const whole = (min: number, max: number, fallback: number) =>
  blankAsMissing(
    z
      .string()
      .regex(/^\d+$/, "Whole numbers only")
      .transform(Number)
      .pipe(
        z.number().min(min, `${min} to ${max}`).max(max, `${min} to ${max}`),
      )
      .default(fallback),
  );

const text = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

// An unchecked checkbox is absent from the URL; a checked one has any value.
const checkbox = z
  .string()
  .optional()
  .transform((value) => value !== undefined);

const natureStat = blankAsMissing(
  z.enum(["atk", "def", "spa", "spd", "spe"]).nullable().default(null),
);

const spread = <T extends z.ZodType>(stat: T) =>
  z.object({ hp: stat, atk: stat, def: stat, spa: stat, spd: stat, spe: stat });

const side = z.object({
  species: text,
  level: whole(1, MAX_LEVEL, MAX_LEVEL),
  ivs: spread(whole(0, MAX_IV, MAX_IV)),
  evs: spread(whole(0, MAX_EV, 0)).refine(
    (evs) =>
      Object.values(evs).reduce((sum, ev) => sum + ev, 0) <= MAX_EV_TOTAL,
    `${MAX_EV_TOTAL} EVs in total at most`,
  ),
  up: natureStat,
  down: natureStat,
});

// Every nature that raises a stat lowers another: one without the other is
// a stat line no real creature has. The error goes on the half left empty.
const withRealNature = <T extends typeof side>(schema: T) =>
  schema.superRefine(({ up, down }, ctx) => {
    if ((up === null) === (down === null)) return;
    ctx.addIssue({
      code: "custom",
      path: [up === null ? "up" : "down"],
      message: "A nature raises one stat and lowers another: pick both",
    });
  });

const calculatorSchema = z.object({
  attacker: withRealNature(side.extend({ burned: checkbox })),
  defender: withRealNature(side),
  move: text,
  critical: checkbox,
});

export type CalculatorInput = z.infer<typeof calculatorSchema>;

export interface CalculatorParse {
  input: CalculatorInput | null;
  /** Message by field name; empty when input is not null. */
  errors: Record<string, string>;
}

export function parseCalculator(params: SearchParams): CalculatorParse {
  const get = (name: string) => param(params, name);
  const sideOf = (prefix: string) => ({
    species: get(`${prefix}.species`),
    level: get(`${prefix}.level`),
    ivs: spreadOf((stat) => get(`${prefix}.ivs.${stat}`)),
    evs: spreadOf((stat) => get(`${prefix}.evs.${stat}`)),
    up: get(`${prefix}.up`),
    down: get(`${prefix}.down`),
  });

  const result = calculatorSchema.safeParse({
    attacker: { ...sideOf("attacker"), burned: get("attacker.burned") },
    defender: sideOf("defender"),
    move: get("move"),
    critical: get("critical"),
  });
  if (result.success) return { input: result.data, errors: {} };

  // One message per field: the first issue Zod reports for it.
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return { input: null, errors };
}

const spreadOf = <T>(value: (stat: string) => T) => ({
  hp: value("hp"),
  atk: value("atk"),
  def: value("def"),
  spa: value("spa"),
  spd: value("spd"),
  spe: value("spe"),
});
