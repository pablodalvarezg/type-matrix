import type { Stats } from "@modules/battle/domain/stats";

/*
 * Gen IX damage, singles. v1 leaves out abilities, items, weather, terrain,
 * Terastallization and stat stages: each is a modifier that slots into the
 * chain later. The rounding of every step follows the reference calculator
 * (Smogon's), which the tests use as the oracle.
 */

export interface DamageInput {
  /** The attacker's level. */
  level: number;
  attacker: Stats;
  defender: Stats;
  move: { power: number; category: "physical" | "special" };
  /** The move's type is one of the attacker's. */
  stab: boolean;
  /** Product over the defender's types: 0, 0.25, 0.5, 1, 2 or 4. */
  effectiveness: number;
  critical: boolean;
  burned: boolean;
}

export interface DamageResult {
  /** One per random roll, 85 to 100, so ascending. */
  rolls: number[];
  minPercent: number;
  maxPercent: number;
}

const ROLLS = Array.from({ length: 16 }, (_, i) => 85 + i);

/** Game Freak's rounding: a fraction of exactly .5 rounds down. */
export function pokeRound(value: number): number {
  return value % 1 > 0.5 ? Math.ceil(value) : Math.floor(value);
}

export function damage(input: DamageInput): DamageResult {
  const { level, attacker, defender, move, stab, effectiveness } = input;
  const physical = move.category === "physical";
  const attack = physical ? attacker.atk : attacker.spa;
  const defense = physical ? defender.def : defender.spd;

  let base =
    Math.floor(
      Math.floor(
        (Math.floor((2 * level) / 5 + 2) * move.power * attack) / defense,
      ) / 50,
    ) + 2;
  if (input.critical) base = Math.floor(base * 1.5);

  const roll = (percent: number) => {
    if (effectiveness === 0) return 0;
    let amount = Math.floor((base * percent) / 100);
    if (stab) amount = pokeRound(amount * 1.5);
    amount = Math.floor(amount * effectiveness);
    if (input.burned && physical) amount = Math.floor(amount / 2);
    // A hit that lands always does at least 1.
    return Math.max(1, amount);
  };

  const rolls = ROLLS.map(roll);
  // Truncated, not rounded: 99.96% must not read as a KO.
  const percent = (amount: number) =>
    Math.floor((amount * 1000) / defender.hp) / 10;
  return {
    rolls,
    minPercent: percent(Math.min(...rolls)),
    maxPercent: percent(Math.max(...rolls)),
  };
}
