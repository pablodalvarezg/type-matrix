import { describe, expect, it } from "vitest";

import { MAX_WRONG, progress } from "@modules/hangman/domain/hangman";

const shown = (name: string, letters: string) =>
  progress(name, letters)
    .mask.map((char) => char ?? "_")
    .join("");

describe("progress", () => {
  it("hides every letter of a new game", () => {
    expect(progress("Pikachu", "")).toEqual({
      mask: Array(7).fill(null),
      guessed: [],
      wrong: [],
      remaining: MAX_WRONG,
      status: "playing",
    });
  });

  it.each([
    ["Mr. Mime", "__. ____"],
    ["Type: Null", "____: ____"],
    ["Farfetch’d", "________’_"],
    ["Nidoran♀", "_______♀"],
    ["Porygon2", "_______2"],
    ["Ho-Oh", "__-__"],
  ])("shows what is not a letter in %s from the start", (name, mask) => {
    expect(shown(name, "")).toBe(mask);
  });

  it("reveals a letter in every case and position", () => {
    expect(shown("Ho-Oh", "o")).toBe("_o-O_");
  });

  it("folds accents: e reveals é, as written", () => {
    expect(shown("Flabébé", "e")).toBe("____é_é");
  });

  it("counts only the letters not in the name", () => {
    const game = progress("Mew", "zemq");
    expect(game.wrong).toEqual(["z", "q"]);
    expect(game.remaining).toBe(MAX_WRONG - 2);
  });

  it("is won once every letter is revealed, and gives the answer", () => {
    expect(progress("Mr. Mime", "mrie")).toMatchObject({
      status: "won",
      answer: "Mr. Mime",
    });
  });

  it(`is lost at ${MAX_WRONG} wrong letters, and gives the answer`, () => {
    expect(progress("Mew", "abcdfg")).toMatchObject({
      status: "lost",
      remaining: 0,
      answer: "Mew",
    });
  });

  it("keeps the answer back one wrong letter short of the cap", () => {
    expect(progress("Mew", "abcdf")).not.toHaveProperty("answer");
  });

  it.each(["closed", "gave-up"] as const)(
    "is lost when %s, misses left or not, and gives the answer",
    (stop) => {
      expect(progress("Mew", "a", stop)).toMatchObject({
        status: "lost",
        remaining: MAX_WRONG - 1,
        stopped: stop,
        answer: "Mew",
      });
    },
  );

  it("stays won once closed", () => {
    const game = progress("Mew", "mew", "closed");
    expect(game.status).toBe("won");
    expect(game).not.toHaveProperty("stopped");
  });
});
