/*
 * Battle stats from base stats, Gen III+ formulas. Inputs are assumed in range
 * (level 1–100, IVs 0–31, EVs 0–252): validating them is the schema's job.
 */

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type StatName = keyof Stats;

export const STAT_NAMES = [
  "hp",
  "atk",
  "def",
  "spa",
  "spd",
  "spe",
] as const satisfies readonly StatName[];

export const MAX_LEVEL = 100;
export const MAX_IV = 31;
export const MAX_EV = 252;
export const MAX_EV_TOTAL = 510;

/** A nature raises one stat ×1.1 and lowers another ×0.9. HP is never one. */
export interface Nature {
  up: Exclude<StatName, "hp"> | null;
  down: Exclude<StatName, "hp"> | null;
}

export interface StatInput {
  level: number;
  base: Stats;
  ivs: Stats;
  evs: Stats;
  nature: Nature;
}

export function computeStats({
  level,
  base,
  ivs,
  evs,
  nature,
}: StatInput): Stats {
  const core = (stat: StatName) =>
    Math.floor(
      ((2 * base[stat] + ivs[stat] + Math.floor(evs[stat] / 4)) * level) / 100,
    );

  const stat = (name: StatName): number => {
    if (name === "hp") {
      // Shedinja, the only species with base HP 1, always has 1 HP.
      return base.hp === 1 ? 1 : core("hp") + level + 10;
    }
    return Math.floor(
      ((core(name) + 5) * natureMultiplier(nature, name)) / 100,
    );
  };

  return {
    hp: stat("hp"),
    atk: stat("atk"),
    def: stat("def"),
    spa: stat("spa"),
    spd: stat("spd"),
    spe: stat("spe"),
  };
}

/** In percent, so the rounding stays integer arithmetic like the games'. */
function natureMultiplier({ up, down }: Nature, stat: StatName): number {
  // A nature that raises and lowers the same stat is neutral (Hardy, Docile…).
  if (up === down) return 100;
  if (stat === up) return 110;
  if (stat === down) return 90;
  return 100;
}
