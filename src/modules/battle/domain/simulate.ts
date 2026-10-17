import { damage } from "@modules/battle/domain/damage";
import type { Stats } from "@modules/battle/domain/stats";

/*
 * A 6-vs-6 singles battle, played out with the exact damage formula and the
 * six stats, and nothing else: no abilities, items, statuses, stat stages,
 * recoil or priority (decided by Pablo on 2026-10-14). The moves whose own
 * mechanics would make that absurd are the caller's to leave out.
 */

export const BATTLE_LEVEL = 50;

/**
 * Moves a battle never uses, though the calculator keeps them: without the
 * mechanic that balances each, it would be the best move of half the dex
 * (decided by Pablo on 2026-10-16). PokéAPI flags none of these.
 * TODO(pablo): the list is by hand and may miss one.
 */
export const UNUSED_MOVES: ReadonlySet<string> = new Set([
  // A turn to recharge after.
  "hyper-beam",
  "giga-impact",
  "blast-burn",
  "frenzy-plant",
  "hydro-cannon",
  "rock-wrecker",
  "roar-of-time",
  "prismatic-laser",
  // A turn to charge, or out of reach, first.
  "solar-beam",
  "solar-blade",
  "sky-attack",
  "meteor-beam",
  "electro-shot",
  "fly",
  "dig",
  "dive",
  "bounce",
  "phantom-force",
  "shadow-force",
  // The user faints.
  "explosion",
  "self-destruct",
  "misty-explosion",
  // Fails, or hits later, outside a condition the battle does not model.
  "focus-punch",
  "last-resort",
  "future-sight",
  "doom-desire",
  "dream-eater",
  "belch",
  "steel-beam",
  "fake-out",
  "first-impression",
  "sucker-punch",
  "thunderclap",
  "upper-hand",
  "double-shock",
  // Weaker as the user's HP drops; PokéAPI gives the full power.
  "water-spout",
  "eruption",
  "dragon-energy",
  // Another stat than the formula's: the user's Defense, the target's Attack.
  "body-press",
  "foul-play",
]);

/** The Gen IX critical-hit chance. */
const CRIT_CHANCE = 1 / 24;

export interface BattleMove {
  name: string;
  type: string;
  category: "physical" | "special";
  power: number;
  /** Percent; null never misses. */
  accuracy: number | null;
}

export interface Fighter {
  name: string;
  types: string[];
  /** Battle stats at BATTLE_LEVEL. */
  stats: Stats;
  moves: BattleMove[];
}

/** The type chart as a function, so this domain needs no other's. */
export type Effectiveness = (moveType: string, defender: string[]) => number;

export interface Hit {
  kind: "hit";
  side: 0 | 1;
  attacker: string;
  defender: string;
  move: string;
  /** HP taken, or null for a miss. */
  damage: number | null;
  /** Of the defender's max HP, truncated. */
  percent: number;
  critical: boolean;
  effectiveness: number;
  fainted: boolean;
}

/** A fighter that could not hurt the other sent to the back of its line. */
export interface Swap {
  kind: "swap";
  side: 0 | 1;
  out: string;
  in: string;
}

export type BattleEvent = Hit | Swap;

export interface Battle {
  winner: 0 | 1;
  /** "hp" when the fighters left could not hurt each other. */
  decidedBy: "ko" | "hp";
  events: BattleEvent[];
  /** HP left per fighter, in team order. */
  hp: [number[], number[]];
}

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * The move with the most expected damage against this defender, averaged
 * over the 16 rolls and scaled by accuracy; none if every one does 0.
 */
function bestMove(
  attacker: Fighter,
  defender: Fighter,
  effectiveness: Effectiveness,
) {
  let best: { move: BattleMove; expected: number } | undefined;
  for (const move of attacker.moves) {
    const { rolls } = hitFor(attacker, defender, move, effectiveness, false);
    const expected = (average(rolls) * (move.accuracy ?? 100)) / 100;
    if (expected > 0 && (!best || expected > best.expected)) {
      best = { move, expected };
    }
  }
  return best?.move;
}

const hitFor = (
  attacker: Fighter,
  defender: Fighter,
  move: BattleMove,
  effectiveness: Effectiveness,
  critical: boolean,
) => {
  const multiplier = effectiveness(move.type, defender.types);
  return {
    multiplier,
    ...damage({
      level: BATTLE_LEVEL,
      attacker: attacker.stats,
      defender: defender.stats,
      move,
      stab: attacker.types.includes(move.type),
      effectiveness: multiplier,
      critical,
      burned: false,
    }),
  };
};

/**
 * `random` is [0, 1): accuracy, critical hits, the damage roll and speed
 * ties all draw from it, so a seeded one replays the same battle. A fainted
 * fighter is replaced by the next in its team's line.
 *
 * When neither active fighter can hurt the other, one side sends its active
 * one to the back of the line, like an odometer: side 1 goes through its
 * line, then side 0 moves on one and side 1 goes through it again. The HP
 * left decides only once every pairing of the fighters left has stalled.
 */
export function simulate(
  teams: [Fighter[], Fighter[]],
  effectiveness: Effectiveness,
  random: () => number,
): Battle {
  const hp: [number[], number[]] = [
    teams[0].map((f) => f.stats.hp),
    teams[1].map((f) => f.stats.hp),
  ];
  // Each side's line, by team index: the fainted before `next`, the active
  // one at it, the rest after.
  const line: [number[], number[]] = [
    teams[0].map((_, i) => i),
    teams[1].map((_, i) => i),
  ];
  const next: [number, number] = [0, 0];
  const events: BattleEvent[] = [];

  const member = (side: 0 | 1) => line[side][next[side]]!;
  const fighter = (side: 0 | 1) => teams[side][member(side)]!;
  const left = (side: 0 | 1) => line[side].length - next[side];

  // The best moves only change with the pairing.
  let pairing = "";
  let moves: [BattleMove | undefined, BattleMove | undefined] = [
    undefined,
    undefined,
  ];
  let stalls = 0;

  while (left(0) > 0 && left(1) > 0) {
    if (pairing !== `${member(0)}:${member(1)}`) {
      pairing = `${member(0)}:${member(1)}`;
      moves = [
        bestMove(fighter(0), fighter(1), effectiveness),
        bestMove(fighter(1), fighter(0), effectiveness),
      ];
    }

    if (!moves[0] && !moves[1]) {
      if (++stalls >= left(0) * left(1)) {
        return byHp(teams, hp, events, random);
      }
      const side: 0 | 1 = stalls % left(1) === 0 ? 0 : 1;
      const out = fighter(side).name;
      line[side].push(...line[side].splice(next[side], 1));
      events.push({ kind: "swap", side, out, in: fighter(side).name });
      continue;
    }
    stalls = 0;

    const speed = fighter(0).stats.spe - fighter(1).stats.spe;
    const first: 0 | 1 = speed > 0 ? 0 : speed < 0 ? 1 : random() < 0.5 ? 0 : 1;
    for (const side of [first, (1 - first) as 0 | 1]) {
      const foe = (1 - side) as 0 | 1;
      const move = moves[side];
      if (!move) continue;
      events.push(strike(side, move));
      // A fighter knocked out before its move does not make it.
      if (hp[foe][member(foe)] === 0) break;
    }
    for (const side of [0, 1] as const) {
      if (hp[side][member(side)] === 0) next[side]++;
    }
  }
  return { winner: left(0) > 0 ? 0 : 1, decidedBy: "ko", events, hp };

  function strike(side: 0 | 1, move: BattleMove): Hit {
    const foe = (1 - side) as 0 | 1;
    const attacker = fighter(side);
    const defender = fighter(foe);
    const base = {
      kind: "hit" as const,
      side,
      attacker: attacker.name,
      defender: defender.name,
      move: move.name,
    };
    if (move.accuracy !== null && random() * 100 >= move.accuracy) {
      return {
        ...base,
        damage: null,
        percent: 0,
        critical: false,
        effectiveness: effectiveness(move.type, defender.types),
        fainted: false,
      };
    }
    const critical = random() < CRIT_CHANCE;
    const { rolls, multiplier } = hitFor(
      attacker,
      defender,
      move,
      effectiveness,
      critical,
    );
    const before = hp[foe][member(foe)]!;
    const dealt = Math.min(before, rolls[Math.floor(random() * rolls.length)]!);
    hp[foe][member(foe)] = before - dealt;
    return {
      ...base,
      damage: dealt,
      percent: Math.floor((dealt * 1000) / defender.stats.hp) / 10,
      critical,
      effectiveness: multiplier,
      fainted: dealt === before,
    };
  }
}

/** A stalemate goes to the side with more of its HP left, as a fraction. */
function byHp(
  teams: [Fighter[], Fighter[]],
  hp: [number[], number[]],
  events: BattleEvent[],
  random: () => number,
): Battle {
  const share = (side: 0 | 1) =>
    hp[side].reduce((sum, left, i) => sum + left / teams[side][i]!.stats.hp, 0);
  const lead = share(0) - share(1);
  const winner = lead > 0 ? 0 : lead < 0 ? 1 : random() < 0.5 ? 0 : 1;
  return { winner, decidedBy: "hp", events, hp };
}
