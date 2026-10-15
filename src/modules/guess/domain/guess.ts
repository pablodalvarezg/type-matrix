// Decided by Pablo on 2026-10-14.
export const MAX_GUESSES = 10;

/** Misses after which each hint shows: generation, then types, then the name's shape. */
export const HINTS_AT = { generation: 3, types: 6, initial: 9 } as const;

/** What a guess is compared on with an arrow. */
export const SCALES = ["generation", "stage", "height", "weight"] as const;
export type Scale = (typeof SCALES)[number];

export type Status = "playing" | "won" | "lost";

/** What ends a game before its guesses do: a daily puzzle closing, or the player. */
export type Stop = "closed" | "gave-up";

/** A species as this game sees it: what a guess shows and is compared on. */
export interface Entry {
  name: string;
  types: string[];
  generation: number;
  /** 1, 2 or 3 in its evolution line. */
  stage: number;
  /** Its Pokédex color. */
  color: string;
  /** Decimetres. */
  height: number;
  /** Hectograms. */
  weight: number;
}

// PokéAPI's decimetres and hectograms, exact at these decimals (decided by
// Pablo on 2026-10-15).
export const metres = (dm: number) => `${(dm / 10).toFixed(2)} m`;
export const kilos = (hg: number) => `${(hg / 10).toFixed(1)} kg`;

/** exact: the same types, in any order · partial: at least one shared. */
export type TypeMatch = "exact" | "partial" | "none";

/** Where the answer's value sits against the guess's. */
export type Arrow = "higher" | "lower" | "equal";

export interface Row extends Entry {
  typeMatch: TypeMatch;
  /** One per type of the guess, in its order: whether the answer has it. */
  typeHits: boolean[];
  colorHit: boolean;
  arrows: Record<Scale, Arrow>;
}

/** What the misses so far have unlocked about the answer. */
export interface Hints {
  generation?: number;
  types?: string[];
  initial?: Initial;
}

/**
 * The name's first letter and its shape: letters only, counted per part, so
 * "Mr. Mime" is 2 + 4 with a space and "Chi-Yu" 3 + 2 with a hyphen. A
 * total alone would hide that the name has two parts (decided by Pablo on
 * 2026-10-15). No name has more than one space or hyphen. Hangman's shape
 * counts the same way; domains share nothing, so each has its own copy.
 */
export interface Initial {
  letter: string;
  parts: number[];
  joiner?: "space" | "hyphen";
}

function initialOf(name: string): Initial {
  const joiner = name.includes(" ")
    ? "space"
    : name.includes("-")
      ? "hyphen"
      : undefined;
  return {
    letter: name[0]!,
    parts: name.split(/[ -]/).map((part) => part.match(/\p{L}/gu)?.length ?? 0),
    ...(joiner && { joiner }),
  };
}

/** What the player may see of a game. `answer` exists only once it is over. */
export interface Progress {
  rows: Row[];
  remaining: number;
  status: Status;
  /** Why a lost game ended early, if it did. */
  stopped?: Stop;
  hints: Hints;
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
    ...guess,
    typeMatch: typeMatch(guess.types, answer.types),
    typeHits: guess.types.map((type) => answer.types.includes(type)),
    colorHit: guess.color === answer.color,
    arrows: Object.fromEntries(
      SCALES.map((scale) => [scale, arrow(guess[scale], answer[scale])]),
    ) as Record<Scale, Arrow>,
  };
}

export function hints(answer: Entry, misses: number): Hints {
  return {
    ...(misses >= HINTS_AT.generation && { generation: answer.generation }),
    ...(misses >= HINTS_AT.types && { types: answer.types }),
    ...(misses >= HINTS_AT.initial && { initial: initialOf(answer.name) }),
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
  const outOfGuesses = guesses.length >= MAX_GUESSES;
  const status: Status = won
    ? "won"
    : stop || outOfGuesses
      ? "lost"
      : "playing";
  const misses = guesses.filter((guess) => guess.name !== answer.name).length;

  return {
    rows: guesses.map((guess) => compare(guess, answer)),
    remaining: MAX_GUESSES - guesses.length,
    status,
    // Only if the stop is what ended it: a game already out of guesses was
    // lost before its puzzle closed.
    ...(!won && !outOfGuesses && stop && { stopped: stop }),
    hints: hints(answer, misses),
    ...(status !== "playing" && { answer }),
  };
}
