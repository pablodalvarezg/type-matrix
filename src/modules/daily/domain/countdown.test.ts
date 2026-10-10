import { describe, expect, it } from "vitest";

import { clock, untilMidnight } from "@modules/daily/domain/countdown";

describe("untilMidnight", () => {
  it("counts to the next local midnight", () => {
    expect(untilMidnight(new Date(2026, 9, 9, 23, 59, 30))).toBe(30_000);
    expect(untilMidnight(new Date(2026, 9, 9, 0, 0, 0))).toBe(86_400_000);
  });
});

describe("clock", () => {
  it.each([
    [30_000, "0:00:30"],
    [3_723_000, "1:02:03"],
    [86_400_000, "24:00:00"],
    [-5, "0:00:00"],
  ])("shows %i ms as %s", (ms, shown) => {
    expect(clock(ms)).toBe(shown);
  });
});
