import { describe, expect, it } from "vitest";

import {
  compare,
  MAX_GUESSES,
  progress,
  type Entry,
} from "@modules/guess/domain/guess";

// Made-up entries: the rules do not depend on which species they are.
const entry = (
  name: string,
  types: string[],
  base = 50,
  stats: Partial<Entry["stats"]> = {},
): Entry => ({
  name,
  types,
  stats: {
    hp: base,
    atk: base,
    def: base,
    spa: base,
    spd: base,
    spe: base,
    ...stats,
  },
});

const answer = entry("Answer", ["fire", "flying"]);
const misses = (count: number) =>
  Array.from({ length: count }, (_, i) => entry(`Miss ${i}`, ["water"]));

describe("compare", () => {
  it.each([
    [["fire", "flying"], "exact"],
    [["flying", "fire"], "exact"],
    [["fire"], "partial"],
    [["fire", "water"], "partial"],
    [["water", "grass"], "none"],
  ])("types %j against fire/flying are %s", (types, match) => {
    expect(compare(entry("Guess", types), answer).typeMatch).toBe(match);
  });

  it("is partial for a dual-typed guess against one of its types alone", () => {
    const mono = entry("Mono", ["fire"]);
    expect(compare(answer, mono).typeMatch).toBe("partial");
  });

  it("points each stat at the answer's", () => {
    const guess = entry("Guess", ["water"], 50, { hp: 40, atk: 60 });
    expect(compare(guess, answer).arrows).toEqual({
      hp: "higher",
      atk: "lower",
      def: "equal",
      spa: "equal",
      spd: "equal",
      spe: "equal",
    });
  });

  it("shows the guess's own name, types and stats", () => {
    const guess = entry("Guess", ["water"], 70);
    expect(compare(guess, answer)).toMatchObject(guess);
  });
});

describe("progress", () => {
  it("starts with every guess left and no answer", () => {
    expect(progress(answer, [])).toEqual({
      rows: [],
      remaining: MAX_GUESSES,
      status: "playing",
    });
  });

  it("is won by guessing the answer, and gives it in full", () => {
    expect(progress(answer, [...misses(2), answer])).toMatchObject({
      status: "won",
      remaining: MAX_GUESSES - 3,
      answer,
    });
  });

  it("is won, not lost, when the last guess allowed is the answer", () => {
    const game = progress(answer, [...misses(MAX_GUESSES - 1), answer]);
    expect(game.status).toBe("won");
  });

  it(`is lost after ${MAX_GUESSES} misses, and gives the answer`, () => {
    expect(progress(answer, misses(MAX_GUESSES))).toMatchObject({
      status: "lost",
      remaining: 0,
      answer,
    });
  });

  it("keeps the answer back one guess short of the cap", () => {
    const game = progress(answer, misses(MAX_GUESSES - 1));
    expect(game.status).toBe("playing");
    expect(game).not.toHaveProperty("answer");
  });

  it("is lost once closed, guesses left or not, and gives the answer", () => {
    expect(progress(answer, misses(2), true)).toMatchObject({
      status: "lost",
      remaining: MAX_GUESSES - 2,
      answer,
    });
  });

  it("stays won once closed", () => {
    expect(progress(answer, [answer], true).status).toBe("won");
  });
});
