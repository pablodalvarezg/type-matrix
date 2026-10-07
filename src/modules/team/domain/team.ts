/*
 * Types are plain strings here: boundaries keep this layer away from
 * dex/domain, so the chart and the list of types come in as data. The shapes
 * match dex's TypeChart and TYPE_NAMES structurally.
 */

/** Attacking type → defending type → multiplier; a missing pair is ×1. */
export type TypeChart = Readonly<
  Record<string, Partial<Record<string, number>>>
>;

/** One or two types: a member's typing, or a defender's. */
export type Typing = readonly string[];

export interface WeaknessRow {
  attack: string;
  /** Members that take ×2 or more. */
  weak: number;
  /** Members that take less than ×1 but more than ×0. */
  resist: number;
  /** Members that take ×0. */
  immune: number;
  /** Two or more weak members and nobody resisting or immune. */
  warning: boolean;
}

export interface CoverageRow {
  defender: Typing;
  /** Best multiplier any of the team's STAB types reaches; 0 with no STAB. */
  best: number;
}

export interface TeamAnalysis {
  weaknesses: WeaknessRow[];
  /** Against each single type. */
  coverage: CoverageRow[];
  /** Dual types the team's STAB hits for ×1 at best. */
  holes: CoverageRow[];
}

// Dual types multiply, so any immunity makes the product 0.
const multiplier = (chart: TypeChart, attack: string, defender: Typing) =>
  defender.reduce((product, type) => product * (chart[attack]?.[type] ?? 1), 1);

/**
 * The two-type defenders that some species actually has, once each and in
 * the order of `types`: Fire/Flying and Flying/Fire are the same defender.
 */
export function dualTypes(types: Typing, typings: Typing[]): Typing[] {
  const key = (typing: Typing) => [...typing].sort().join("/");
  const present = new Set(
    typings.filter((typing) => typing.length === 2).map(key),
  );
  return types.flatMap((first, index) =>
    types
      .slice(index + 1)
      .map((second) => [first, second])
      .filter((pair) => present.has(key(pair))),
  );
}

export function analyzeTeam({
  chart,
  types,
  members,
  dualDefenders,
}: {
  chart: TypeChart;
  /** Every type, in display order: the attackers and the single defenders. */
  types: Typing;
  members: Typing[];
  dualDefenders: Typing[];
}): TeamAnalysis {
  const weaknesses = types.map((attack) => {
    const taken = members.map((member) => multiplier(chart, attack, member));
    const weak = taken.filter((m) => m >= 2).length;
    const resist = taken.filter((m) => m > 0 && m < 1).length;
    const immune = taken.filter((m) => m === 0).length;
    return {
      attack,
      weak,
      resist,
      immune,
      warning: weak >= 2 && resist + immune === 0,
    };
  });

  const stab = [...new Set(members.flat())];
  const cover = (defender: Typing): CoverageRow => ({
    defender,
    best: Math.max(0, ...stab.map((type) => multiplier(chart, type, defender))),
  });

  return {
    weaknesses,
    coverage: types.map((type) => cover([type])),
    holes: dualDefenders.map(cover).filter((row) => row.best <= 1),
  };
}
