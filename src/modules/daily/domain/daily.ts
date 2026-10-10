import { createHmac } from "node:crypto";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Days since launch, plus one. Both are `YYYY-MM-DD`; below 1 is before launch. */
export const puzzleNumber = (date: string, launch: string) =>
  (Date.parse(date) - Date.parse(launch)) / DAY + 1;

/** The first and last dates that are today somewhere, UTC−12 to UTC+14. */
export function todayWindow(now: Date): [string, string] {
  const at = (hours: number) =>
    new Date(now.getTime() + hours * HOUR).toISOString().slice(0, 10);
  return [at(-12), at(14)];
}

/** When `date` stops being today anywhere: midnight in UTC−12, the next day. */
export const closesAt = (date: string) =>
  new Date(Date.parse(date) + 36 * HOUR);

export function isToday(date: string, now: Date): boolean {
  const [first, last] = todayWindow(now);
  return first <= date && date <= last;
}

const hmac = (key: string, data: string) =>
  createHmac("sha256", key).update(data).digest("hex");

/**
 * The pool in an order only the secret can rebuild: sorted by a keyed hash of
 * each slug, seeded with HMAC(secret, version). The repo is public, so
 * without the secret tomorrow's answer is out of reach.
 */
export function shuffle(
  pool: readonly string[],
  secret: string,
  version: string,
): string[] {
  const seed = hmac(secret, version);
  const keys = new Map(pool.map((slug) => [slug, hmac(seed, slug)]));
  return [...pool].sort((a, b) => (keys.get(a)! < keys.get(b)! ? -1 : 1));
}

/**
 * Puzzle `n`'s species in a shuffled `order`. With `avoid` (another round's
 * species that day) a clash takes the species half the order away instead:
 * order[n] is the clash, so that one cannot be it too.
 */
export function dailyAnswer(
  order: readonly string[],
  n: number,
  avoid?: string,
): string {
  const pick = order[n % order.length]!;
  if (pick !== avoid) return pick;
  return order[(n + Math.floor(order.length / 2)) % order.length]!;
}

/** One finished daily game. */
export interface Result {
  puzzle: number;
  won: boolean;
}

/**
 * Runs of consecutive puzzle numbers won. The current run stays alive while
 * today's puzzle is unplayed, and ends with a loss or a puzzle skipped.
 */
export function streaks(
  results: Result[],
  today: number,
): { current: number; best: number } {
  const won = new Set(results.filter((r) => r.won).map((r) => r.puzzle));
  const runTo = (puzzle: number) => {
    let length = 0;
    while (won.has(puzzle - length)) length++;
    return length;
  };
  const played = results.some((r) => r.puzzle === today);

  return {
    current: runTo(played ? today : today - 1),
    best: Math.max(0, ...[...won].filter((n) => !won.has(n + 1)).map(runTo)),
  };
}

/** A leaderboard time: m:ss, or h:mm:ss from an hour on. Seconds floor. */
export function duration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const [h, m, s] = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
