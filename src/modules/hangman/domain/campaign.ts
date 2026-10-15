// Decided by Pablo on 2026-10-13.
export const WINS_PER_GEN = 10;

export interface Campaign {
  /** Generations finished, from Gen I up. */
  completed: number;
  /** Wins toward the current generation. */
  wins: number;
  /** The generation being played; null once all of them are done. */
  current: number | null;
}

/**
 * Derived from the finished campaign games in order, `true` for a win: each
 * win counts toward the current generation, each loss (a give-up too) takes
 * one back, never below zero, and a finished generation stays finished.
 */
export function campaign(results: boolean[], generations: number): Campaign {
  let completed = 0;
  let wins = 0;
  for (const won of results) {
    if (completed === generations) break;
    if (!won) {
      wins = Math.max(wins - 1, 0);
    } else if (++wins === WINS_PER_GEN) {
      completed += 1;
      wins = 0;
    }
  }
  return {
    completed,
    wins,
    current: completed < generations ? completed + 1 : null,
  };
}

/**
 * What a free-play game may be limited to; empty is every species. While the
 * campaign runs, one generation it has finished. Once it is done, any set.
 */
export function canPick(
  gens: number[],
  { current }: Campaign,
  generations: number,
): boolean {
  if (gens.some((gen) => gen < 1 || gen > generations)) return false;
  if (gens.length === 0 || current === null) return true;
  return gens.length === 1 && gens[0]! < current;
}
