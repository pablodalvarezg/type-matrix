// TODO(pablo): the README's default for wrong letters allowed.
export const MAX_WRONG = 6;

export type Status = "playing" | "won" | "lost";

/** What the player may see of a game. `answer` exists only once it is over. */
export interface Progress {
  /** The name character by character; `null` is a letter not guessed yet. */
  mask: (string | null)[];
  /** Every letter tried, in order. */
  guessed: string[];
  wrong: string[];
  remaining: number;
  status: Status;
  answer?: string;
}

// Accents folded and lowercased: "é" plays as "e".
const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const isLetter = (char: string) => /^[a-z]$/.test(char);

/**
 * `letters` are the guesses in order, already lowercase a–z. Anything in the
 * name that is not a letter (spaces, dots, apostrophes, ♀, digits) is shown
 * from the start: the shape of the name is public, its letters are not.
 */
export function progress(name: string, letters: string): Progress {
  const folded = fold(name);
  const mask = [...name].map((char) => {
    const key = fold(char);
    return !isLetter(key) || letters.includes(key) ? char : null;
  });
  const wrong = [...letters].filter((letter) => !folded.includes(letter));
  const status: Status = !mask.includes(null)
    ? "won"
    : wrong.length >= MAX_WRONG
      ? "lost"
      : "playing";

  return {
    mask,
    guessed: [...letters],
    wrong,
    remaining: MAX_WRONG - wrong.length,
    status,
    ...(status !== "playing" && { answer: name }),
  };
}
