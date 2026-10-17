import { describe, expect, it } from "vitest";

import { points, streaks } from "@shared/score";

describe("points", () => {
  it("adds 20 per try left and a point per second under 180", () => {
    expect(points(6, 30)).toBe(100 + 120 + 150);
    expect(points(4, 60)).toBe(100 + 80 + 120);
  });

  it("gives nothing for time past the limit", () => {
    expect(points(1, 179)).toBe(100 + 20 + 1);
    expect(points(1, 180)).toBe(120);
    // A game left open for a month.
    expect(points(1, 2_600_000)).toBe(120);
  });
});

describe("streaks", () => {
  it("is empty before any game", () => {
    const empty = { wins: 0, points: 0 };
    expect(streaks([])).toEqual({ current: empty, best: empty });
  });

  it("sums the wins since the last loss", () => {
    expect(streaks([300, null, 200, 250]).current).toEqual({
      wins: 2,
      points: 450,
    });
  });

  it("keeps the run that scored the most, not the longest", () => {
    const { current, best } = streaks([400, 400, null, 100, 100, 100]);
    expect(best).toEqual({ wins: 2, points: 800 });
    expect(current).toEqual({ wins: 3, points: 300 });
  });

  it("ends the current run with a loss", () => {
    expect(streaks([300, null]).current).toEqual({ wins: 0, points: 0 });
  });
});
