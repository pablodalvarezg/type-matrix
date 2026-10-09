import { describe, expect, it } from "vitest";

import {
  closesAt,
  isToday,
  puzzleNumber,
  shuffle,
  streaks,
  todayWindow,
} from "@modules/daily/domain/daily";
import { POOL_V1 } from "@modules/daily/domain/pool";

describe("puzzleNumber", () => {
  it("is 1 on launch day and counts days from there", () => {
    expect(puzzleNumber("2026-10-09", "2026-10-09")).toBe(1);
    expect(puzzleNumber("2026-10-10", "2026-10-09")).toBe(2);
    expect(puzzleNumber("2027-03-01", "2026-12-31")).toBe(61);
  });

  it("is below 1 before launch", () => {
    expect(puzzleNumber("2026-10-08", "2026-10-09")).toBe(0);
  });
});

describe("todayWindow", () => {
  const at = (iso: string) => todayWindow(new Date(iso));

  it("holds two dates at midnight UTC", () => {
    expect(at("2026-10-09T00:00:00Z")).toEqual(["2026-10-08", "2026-10-09"]);
  });

  it("gains tomorrow when UTC+14 reaches midnight", () => {
    expect(at("2026-10-09T09:59:59.999Z")[1]).toBe("2026-10-09");
    expect(at("2026-10-09T10:00:00Z")).toEqual(["2026-10-08", "2026-10-10"]);
  });

  it("drops yesterday when UTC−12 reaches midnight", () => {
    expect(at("2026-10-09T11:59:59.999Z")[0]).toBe("2026-10-08");
    expect(at("2026-10-09T12:00:00Z")[0]).toBe("2026-10-09");
  });

  it("lets a date go when it closes, not before", () => {
    const closes = closesAt("2026-10-08");
    expect(closes.toISOString()).toBe("2026-10-09T12:00:00.000Z");
    expect(isToday("2026-10-08", new Date(closes.getTime() - 1))).toBe(true);
    expect(isToday("2026-10-08", closes)).toBe(false);
  });

  it("accepts only dates inside it", () => {
    const now = new Date("2026-10-09T10:00:00Z");
    expect(isToday("2026-10-08", now)).toBe(true);
    expect(isToday("2026-10-10", now)).toBe(true);
    expect(isToday("2026-10-07", now)).toBe(false);
    expect(isToday("2026-10-11", now)).toBe(false);
  });
});

describe("shuffle", () => {
  const order = shuffle(POOL_V1, "a".repeat(32), "v1");

  it("is deterministic", () => {
    expect(shuffle(POOL_V1, "a".repeat(32), "v1")).toEqual(order);
  });

  it("reorders the pool without losing or repeating a species", () => {
    expect(order).not.toEqual(POOL_V1);
    expect(order.toSorted()).toEqual(POOL_V1.toSorted());
  });

  it("gives another answer with another secret or version", () => {
    expect(shuffle(POOL_V1, "b".repeat(32), "v1")[1]).not.toBe(order[1]);
    expect(shuffle(POOL_V1, "a".repeat(32), "v2")[1]).not.toBe(order[1]);
  });
});

describe("streaks", () => {
  const won = (...puzzles: number[]) =>
    puzzles.map((puzzle) => ({ puzzle, won: true }));
  const lost = (puzzle: number) => ({ puzzle, won: false });

  it("counts consecutive wins up to today", () => {
    expect(streaks(won(3, 4, 5), 5)).toEqual({ current: 3, best: 3 });
  });

  it("stays alive while today is unplayed", () => {
    expect(streaks(won(3, 4), 5)).toEqual({ current: 2, best: 2 });
  });

  it("breaks on a puzzle skipped", () => {
    expect(streaks(won(1, 2, 4, 5), 5)).toEqual({ current: 2, best: 2 });
    expect(streaks(won(3, 4), 6)).toEqual({ current: 0, best: 2 });
  });

  it("breaks on a loss, today's too", () => {
    expect(streaks([...won(1, 2), lost(3), ...won(4)], 4).current).toBe(1);
    expect(streaks([...won(3, 4), lost(5)], 5)).toEqual({
      current: 0,
      best: 2,
    });
  });

  it("keeps the best run apart from the current one", () => {
    expect(streaks(won(1, 2, 3, 4, 7, 8), 8)).toEqual({ current: 2, best: 4 });
  });

  it("is zero with nothing played", () => {
    expect(streaks([], 1)).toEqual({ current: 0, best: 0 });
  });
});
