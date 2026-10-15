import { describe, expect, it } from "vitest";

import {
  compare,
  hints,
  HINTS_AT,
  kilos,
  MAX_GUESSES,
  metres,
  progress,
  type Entry,
} from "@modules/guess/domain/guess";

// Made-up entries: the rules do not depend on which species they are.
const entry = (
  name: string,
  types: string[],
  rest: Partial<Omit<Entry, "name" | "types">> = {},
): Entry => ({
  name,
  types,
  generation: 4,
  stage: 2,
  color: "red",
  height: 10,
  weight: 100,
  ...rest,
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

  it.each([
    [
      ["fire", "flying"],
      [true, true],
    ],
    [
      ["flying", "water"],
      [true, false],
    ],
    [
      ["water", "fire"],
      [false, true],
    ],
    [["grass"], [false]],
  ])("marks each of %j against fire/flying: %j", (types, hits) => {
    expect(compare(entry("Guess", types), answer).typeHits).toEqual(hits);
  });

  it("is partial for a dual-typed guess against one of its types alone", () => {
    const mono = entry("Mono", ["fire"]);
    expect(compare(answer, mono).typeMatch).toBe("partial");
  });

  it("points generation, stage, height and weight at the answer's", () => {
    const guess = entry("Guess", ["water"], {
      generation: 2,
      stage: 3,
      height: 10,
      weight: 101,
    });
    expect(compare(guess, answer).arrows).toEqual({
      generation: "higher",
      stage: "lower",
      height: "equal",
      weight: "lower",
    });
  });

  it("tells whether the color is the answer's", () => {
    expect(compare(entry("Red", ["water"]), answer).colorHit).toBe(true);
    const blue = entry("Blue", ["water"], { color: "blue" });
    expect(compare(blue, answer).colorHit).toBe(false);
  });

  it("shows the guess's own values", () => {
    const guess = entry("Guess", ["water"], { color: "blue", weight: 5 });
    expect(compare(guess, answer)).toMatchObject(guess);
  });
});

describe("units", () => {
  it("shows decimetres as metres with two decimals", () => {
    expect(metres(4)).toBe("0.40 m");
    expect(metres(145)).toBe("14.50 m");
  });

  it("shows hectograms as kilograms with one decimal", () => {
    expect(kilos(1)).toBe("0.1 kg");
    expect(kilos(9999)).toBe("999.9 kg");
  });
});

describe("hints", () => {
  const named = entry("Flabébé", ["fairy"], { generation: 6 });

  it("gives nothing before the first threshold", () => {
    expect(hints(named, HINTS_AT.generation - 1)).toEqual({});
  });

  it("adds the generation, then the types, then the name's shape", () => {
    expect(hints(named, HINTS_AT.generation)).toEqual({ generation: 6 });
    expect(hints(named, HINTS_AT.types)).toEqual({
      generation: 6,
      types: ["fairy"],
    });
    expect(hints(named, HINTS_AT.initial)).toEqual({
      generation: 6,
      types: ["fairy"],
      initial: { letter: "F", parts: [7] },
    });
  });

  it.each([
    ["Mr. Mime", [2, 4], "space"],
    ["Type: Null", [4, 4], "space"],
    ["Chi-Yu", [3, 2], "hyphen"],
    ["Farfetch’d", [9], undefined],
    ["Nidoran♀", [7], undefined],
    ["Porygon2", [7], undefined],
  ])("shapes %s as letters per part: %j", (name, parts, joiner) => {
    const { initial } = hints(entry(name, ["normal"]), HINTS_AT.initial);
    expect(initial).toEqual({
      letter: name[0],
      parts,
      ...(joiner && { joiner }),
    });
  });

  it("leaves the shape for the last guess", () => {
    expect(HINTS_AT.initial).toBe(MAX_GUESSES - 1);
  });
});

describe("progress", () => {
  it("starts with every guess left, no hints and no answer", () => {
    expect(progress(answer, [])).toEqual({
      rows: [],
      remaining: MAX_GUESSES,
      status: "playing",
      hints: {},
    });
  });

  it("unlocks hints by misses", () => {
    expect(progress(answer, misses(HINTS_AT.types)).hints).toEqual({
      generation: 4,
      types: ["fire", "flying"],
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

  it.each(["closed", "gave-up"] as const)(
    "is lost when %s, guesses left or not, and gives the answer",
    (stop) => {
      expect(progress(answer, misses(2), stop)).toMatchObject({
        status: "lost",
        remaining: MAX_GUESSES - 2,
        stopped: stop,
        answer,
      });
    },
  );

  it("stays out of guesses, not closed, when it closes after", () => {
    const game = progress(answer, misses(MAX_GUESSES), "closed");
    expect(game).toMatchObject({ status: "lost", remaining: 0 });
    expect(game).not.toHaveProperty("stopped");
  });

  it("stays won once closed", () => {
    const game = progress(answer, [answer], "closed");
    expect(game.status).toBe("won");
    expect(game).not.toHaveProperty("stopped");
  });
});
