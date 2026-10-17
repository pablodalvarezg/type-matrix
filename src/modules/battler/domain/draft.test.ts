import { describe, expect, it } from "vitest";

import {
  bracket,
  draw,
  inPool,
  offers,
  rivalTeam,
  TEAM_SIZE,
  type Candidate,
} from "@modules/battler/domain/draft";

const candidate = (slug: string, total = 500, evolves = false): Candidate => ({
  slug,
  total,
  evolves,
});

const pool = Array.from({ length: 20 }, (_, i) =>
  candidate(`s${i}`, 300 + 10 * i),
);

const seeded =
  (state = 7) =>
  () =>
    (state = (state * 16807) % 2147483647) / 2147483647;

describe("inPool", () => {
  it("takes every species on easy and hard", () => {
    expect(inPool("easy", candidate("caterpie", 195, true))).toBe(true);
    expect(inPool("hard", candidate("caterpie", 195, true))).toBe(true);
  });

  it("takes on Nuzlocke only species that evolve no further, 450 or more", () => {
    expect(inPool("nuzlocke", candidate("tauros", 490))).toBe(true);
    expect(inPool("nuzlocke", candidate("cut-off", 450))).toBe(true);
    expect(inPool("nuzlocke", candidate("minior", 440))).toBe(false);
    expect(inPool("nuzlocke", candidate("bisharp", 490, true))).toBe(false);
  });
});

describe("draw", () => {
  it("draws distinct items, at most as many as there are", () => {
    const drawn = draw(pool, 6, seeded());
    expect(new Set(drawn).size).toBe(6);
    expect(draw(pool.slice(0, 2), 6, seeded())).toHaveLength(2);
  });

  it("draws the same from the same seed", () => {
    expect(draw(pool, 6, seeded(3))).toEqual(draw(pool, 6, seeded(3)));
  });
});

describe("offers", () => {
  it("never offers a species already on the team", () => {
    const picks = pool.slice(0, 18).map((c) => c.slug);
    expect(
      offers(pool, picks, 3, seeded())
        .map((c) => c.slug)
        .sort(),
    ).toEqual(["s18", "s19"]);
  });
});

describe("rivalTeam", () => {
  it("is six distinct species", () => {
    for (const difficulty of ["easy", "hard"] as const) {
      const team = rivalTeam(pool, difficulty, seeded());
      expect(team).toHaveLength(TEAM_SIZE);
      expect(new Set(team).size).toBe(TEAM_SIZE);
    }
  });

  it("takes the best of three when rivals draft", () => {
    // Each pick consumes three draws; a constant draw always offers the
    // first three left, so the best of them is the third.
    const team = rivalTeam(pool, "hard", () => 0);
    expect(team).toEqual(["s2", "s3", "s4", "s5", "s6", "s7"]);
  });

  it("draws at random on easy", () => {
    expect(rivalTeam(pool, "easy", () => 0)).toEqual([
      "s0",
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
    ]);
  });
});

describe("bracket", () => {
  it("pairs neighbours and sends each winner on, three rounds for eight", () => {
    const rounds = bracket([1, 2, 3, 4, 5, 6, 7, 8], ([a, b]) => ({
      winner: a > b ? 0 : 1,
      next: Math.max(a, b),
      result: null,
    }));
    expect(rounds.map((round) => round.map((m) => m.teams))).toEqual([
      [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ],
      [
        [2, 4],
        [6, 8],
      ],
      [[4, 8]],
    ]);
    expect(rounds[2]![0]!.winner).toBe(1);
  });

  it("carries on the team as `play` hands it back", () => {
    const rounds = bracket(["a", "b", "c", "d"], ([a, b]) => ({
      winner: 0,
      next: `${a}!`,
      result: b,
    }));
    expect(rounds[1]![0]!.teams).toEqual(["a!", "c!"]);
  });
});
