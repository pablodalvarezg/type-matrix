// TODO(pablo): the README's default for the guess cap.
export const MAX_GUESSES = 8;

export const STATS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type Stat = (typeof STATS)[number];

export type Status = "playing" | "won" | "lost";

/** What ends a game before its guesses do: a daily puzzle closing, or the player. */
export type Stop = "closed" | "gave-up";

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
  /** One per type of the guess, in its order: whether the answer has it. */
  typeHits: boolean[];
  arrows: Record<Stat, Arrow>;
}

/** What the player may see of a game. `answer` exists only once it is over. */
export interface Progress {
  rows: Row[];
  remaining: number;
  status: Status;
  /** Why a lost game ended early, if it did. */
  stopped?: Stop;
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
    typeHits: guess.types.map((type) => answer.types.includes(type)),
    arrows: Object.fromEntries(
      STATS.map((stat) => [stat, arrow(guess.stats[stat], answer.stats[stat])]),
    ) as Record<Stat, Arrow>,
  };
}

/**
 * `guesses` in order. A guess is the answer when its name is. A `stop` (a
 * daily puzzle no longer today anywhere, or the player giving up) loses a
 * game that is not won yet.
 */
export function progress(
  answer: Entry,
  guesses: Entry[],
  stop?: Stop,
): Progress {
  const won = guesses.some((guess) => guess.name === answer.name);
  const status: Status = won
    ? "won"
    : stop || guesses.length >= MAX_GUESSES
      ? "lost"
      : "playing";

  return {
    rows: guesses.map((guess) => compare(guess, answer)),
    remaining: MAX_GUESSES - guesses.length,
    status,
    ...(!won && stop && { stopped: stop }),
    ...(status !== "playing" && {
      answer: { name: answer.name, types: answer.types, stats: answer.stats },
    }),
  };
}
