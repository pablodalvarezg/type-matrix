// TODO(pablo): the README's default for wrong letters allowed.
export const MAX_WRONG = 6;

export type Status = "playing" | "won" | "lost";

/** What ends a game before its letters do: a daily puzzle closing, or the player. */
export type Stop = "closed" | "gave-up";

/** What the player may see of a game. `answer` exists only once it is over. */
export interface Progress {
  /** The name character by character; `null` is a letter not guessed yet. */
  mask: (string | null)[];
  /** Letters per part of the name, and what joins the parts. As public as the mask. */
  shape: Shape;
  /** Every letter tried, in order. */
  guessed: string[];
  wrong: string[];
  remaining: number;
  status: Status;
  /** Why a lost game ended early, if it did. */
  stopped?: Stop;
  answer?: string;
}

// Accents folded and lowercased: "é" plays as "e".
const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const isLetter = (char: string) => /^[a-z]$/.test(char);

/**
 * "Mr. Mime" is 2 + 4 letters with a space, "Ho-Oh" 2 + 2 with a hyphen: the
 * mask shows the gap, but in a row of blanks it is easy to miss (decided by
 * Pablo on 2026-10-15). Dex Clues' last hint counts the same way; domains
 * share nothing, so each has its own copy. No name has more than one space or
 * hyphen.
 */
export interface Shape {
  parts: number[];
  joiner?: "space" | "hyphen";
}

export function shapeOf(name: string): Shape {
  const joiner = name.includes(" ")
    ? "space"
    : name.includes("-")
      ? "hyphen"
      : undefined;
  return {
    parts: name
      .split(/[ -]/)
      .map((part) => [...part].filter((char) => isLetter(fold(char))).length),
    ...(joiner && { joiner }),
  };
}

/**
 * `letters` are the guesses in order, already lowercase a–z. Anything in the
 * name that is not a letter (spaces, dots, apostrophes, ♀, digits) is shown
 * from the start: the shape of the name is public, its letters are not.
 * A `stop` loses a game that is not won yet.
 */
export function progress(name: string, letters: string, stop?: Stop): Progress {
  const folded = fold(name);
  const mask = [...name].map((char) => {
    const key = fold(char);
    return !isLetter(key) || letters.includes(key) ? char : null;
  });
  const wrong = [...letters].filter((letter) => !folded.includes(letter));
  const won = !mask.includes(null);
  const outOfMisses = wrong.length >= MAX_WRONG;
  const status: Status = won ? "won" : stop || outOfMisses ? "lost" : "playing";

  return {
    mask,
    shape: shapeOf(name),
    guessed: [...letters],
    wrong,
    remaining: MAX_WRONG - wrong.length,
    status,
    // Only if the stop is what ended it: a game already out of misses was
    // lost before its puzzle closed.
    ...(!won && !outOfMisses && stop && { stopped: stop }),
    ...(status !== "playing" && { answer: name }),
  };
}
