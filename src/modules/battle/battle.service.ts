import {
  effectiveness,
  findMove,
  findSpecies,
  snapshot,
  type Move,
  type Species,
} from "@modules/dex";

import { parseCalculator } from "@modules/battle/battle.schema";
import { damage, type DamageResult } from "@modules/battle/domain/damage";
import { computeStats } from "@modules/battle/domain/stats";
import { param, type SearchParams } from "@shared/search-params";

/*
 * The calculator has no answer to hide: every number here is public game
 * data. It runs on the server because that is where the snapshot lives.
 */

export interface CalculatorResult extends DamageResult {
  attacker: string;
  defender: string;
  move: Move;
  stab: boolean;
  effectiveness: number;
  defenderHp: number;
  critical: boolean;
  burned: boolean;
}

export interface CalculatorView {
  /** The raw value of each param, to fill the form back in. */
  values: Record<string, string | undefined>;
  /** Error message by field name. */
  errors: Record<string, string>;
  /** Every species name: the search space, safe to send to the browser. */
  speciesNames: string[];
  /** Names of the moves the chosen attacker can learn. */
  moveNames: string[];
  result: CalculatorResult | null;
}

const speciesNames = snapshot.species.map((species) => species.name);

export function runCalculator(params: SearchParams): CalculatorView {
  const { input, errors } = parseCalculator(params);
  const fail = (field: string, message: string) => {
    errors[field] ??= message;
  };

  // Looked up from the raw params, so the move list still follows the
  // attacker while some other field is invalid.
  const lookUp = (field: string) => {
    const query = param(params, field)?.trim();
    if (!query) return undefined;
    const species = findSpecies(query);
    if (!species) fail(field, `No species called "${query}"`);
    return species;
  };
  const attacker = lookUp("attacker.species");
  const defender = lookUp("defender.species");
  const move = lookUpMove(param(params, "move")?.trim(), attacker, fail);

  const values = Object.fromEntries(
    Object.keys(params).map((name) => [name, param(params, name)]),
  );
  const view = {
    values,
    errors,
    speciesNames,
    moveNames:
      attacker?.moves.flatMap((slug) => findMove(slug)?.name ?? []) ?? [],
  };

  if (!input || !attacker || !defender || !move || Object.keys(errors).length) {
    return { ...view, result: null };
  }

  const stats = (species: Species, side: typeof input.defender) =>
    computeStats({
      level: side.level,
      base: species.stats,
      ivs: side.ivs,
      evs: side.evs,
      nature: { up: side.up, down: side.down },
    });
  const defenderStats = stats(defender, input.defender);
  const stab = attacker.types.includes(move.type);
  const multiplier = effectiveness(
    snapshot.typeChart,
    move.type,
    defender.types,
  );

  return {
    ...view,
    result: {
      ...damage({
        level: input.attacker.level,
        attacker: stats(attacker, input.attacker),
        defender: defenderStats,
        move,
        stab,
        effectiveness: multiplier,
        critical: input.critical,
        burned: input.attacker.burned,
      }),
      attacker: attacker.name,
      defender: defender.name,
      move,
      stab,
      effectiveness: multiplier,
      defenderHp: defenderStats.hp,
      critical: input.critical,
      burned: input.attacker.burned && move.category === "physical",
    },
  };
}

function lookUpMove(
  query: string | undefined,
  attacker: Species | undefined,
  fail: (field: string, message: string) => void,
): Move | undefined {
  if (attacker && attacker.moves.length === 0) {
    // 11 species, Ditto among them: their moves have no fixed power.
    fail(
      "move",
      `${attacker.name} learns no damaging move this calculator models`,
    );
    return undefined;
  }
  if (!query) return undefined;
  const move = findMove(query);
  if (!move) {
    fail("move", `No damaging move called "${query}"`);
    return undefined;
  }
  if (attacker && !attacker.moves.includes(move.slug)) {
    fail("move", `${attacker.name} can't learn ${move.name}`);
    return undefined;
  }
  return move;
}
