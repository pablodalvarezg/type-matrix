import { describe, expect, it } from "vitest";

import { revealSteps, skipFrom } from "@modules/battler/domain/reveal";

const rival = { yours: false, events: 9 };
const yours = { yours: true, events: 3 };

describe("revealSteps", () => {
  it("shows rival matches whole, and waits to play the player's line by line", () => {
    expect(revealSteps([[rival, yours, rival]])).toEqual([
      { shown: 1 },
      { shown: 2, lines: 0, pause: true },
      { shown: 2, lines: 1 },
      { shown: 2, lines: 2 },
      { shown: 2, lines: 3 },
      { shown: 2 },
      { shown: 3 },
    ]);
  });

  it("waits before each of the player's matches, and only then", () => {
    // The player wins the first round and loses the second: the final plays
    // out on its own.
    const steps = revealSteps([
      [yours, rival],
      [{ ...yours, events: 1 }],
      [rival],
    ]);
    expect(steps.filter((step) => step.pause)).toEqual([
      { shown: 1, lines: 0, pause: true },
      { shown: 3, lines: 0, pause: true },
    ]);
    expect(steps.at(-1)).toEqual({ shown: 4 });
  });
});

describe("skipFrom", () => {
  it("lands on the player's next match, or past the end", () => {
    const steps = revealSteps([[yours, rival], [yours]]);
    const second = steps.findLastIndex((step) => step.pause);
    expect(skipFrom(steps, 1)).toBe(second);
    expect(skipFrom(steps, second)).toBe(steps.length);
  });
});
