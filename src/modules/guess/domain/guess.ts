// TODO(pablo): the README's default for the guess cap.
export const MAX_GUESSES = 8;

export const STATS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type Stat = (typeof STATS)[number];

export type Status = "playing" | "won" | "lost";

/** A species as this game sees it: what a guess shows and is compared on. */
export interface Entry {
  name: string;
  types: string[];
  stats: Record<Stat, number>;
}

/** exact: the same types, in any order · partial: at least one shared. */
export type TypeMatch = "exact" | "partial" | "none";

/** Where the answer's stat sits against the guess's. */
export type Arrow = "higher" | "lower" | "equal";

export interface Row extends Entry {
  typeMatch: TypeMatch;
  arrows: Record<Stat, Arrow>;
}

/** What the player may see of a game. `answer` exists only once it is over. */
export interface Progress {
  rows: Row[];
  remaining: number;
  status: Status;
  answer?: Entry;
}

function typeMatch(guess: string[], answer: string[]): TypeMatch {
  const shared = guess.filter((type) => answer.includes(type)).length;
  if (shared === guess.length && shared === answer.length) return "exact";
  return shared > 0 ? "partial" : "none";
}

const arrow = (guess: number, answer: number): Arrow =>
  answer > guess ? "higher" : answer < guess ? "lower" : "equal";

export function compare(guess: Entry, answer: Entry): Row {
  return {
    name: guess.name,
    types: guess.types,
    stats: guess.stats,
    typeMatch: typeMatch(guess.types, answer.types),
    arrows: Object.fromEntries(
      STATS.map((stat) => [stat, arrow(guess.stats[stat], answer.stats[stat])]),
    ) as Record<Stat, Arrow>,
  };
}

/**
 * `guesses` in order. A guess is the answer when its name is. A `closed`
 * game (a daily puzzle no longer today anywhere) is lost unless won.
 */
export function progress(
  answer: Entry,
  guesses: Entry[],
  closed = false,
): Progress {
  const status: Status = guesses.some((guess) => guess.name === answer.name)
    ? "won"
    : closed || guesses.length >= MAX_GUESSES
      ? "lost"
      : "playing";

  return {
    rows: guesses.map((guess) => compare(guess, answer)),
    remaining: MAX_GUESSES - guesses.length,
    status,
    ...(status !== "playing" && {
      answer: { name: answer.name, types: answer.types, stats: answer.stats },
    }),
  };
}
