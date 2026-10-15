import { MAX_WRONG } from "@modules/hangman/domain/hangman";

// TODO(pablo): the formula decided on 2026-10-14; tune once people play it.
const BASE = 100;
const PER_MISS_LEFT = 20;
const TIME_LIMIT_SECONDS = 180;

/** A free-play win, timed in whole seconds: fewer misses and less time score more. */
export function points(misses: number, seconds: number): number {
  return (
    BASE +
    PER_MISS_LEFT * (MAX_WRONG - misses) +
    Math.max(TIME_LIMIT_SECONDS - seconds, 0)
  );
}

export interface Run {
  wins: number;
  points: number;
}

/**
 * From the finished free-play games in order, each win's points or `null`
 * for a loss: the run still going, and the run that scored the most.
 */
export function streaks(results: (number | null)[]): {
  current: Run;
  best: Run;
} {
  let current: Run = { wins: 0, points: 0 };
  let best = current;
  for (const result of results) {
    current =
      result === null
        ? { wins: 0, points: 0 }
        : { wins: current.wins + 1, points: current.points + result };
    if (current.points > best.points) best = current;
  }
  return { current, best };
}
