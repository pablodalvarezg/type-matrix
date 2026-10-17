import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RunRow } from "@modules/battler/battler.repository";
import {
  getOverview,
  getRun,
  order,
  pick,
  reroll,
  startRun,
  type RunView,
} from "@modules/battler/battler.service";
import {
  NUZLOCKE_MIN_TOTAL,
  RIVAL_NAMES,
  TEAM_SIZE,
} from "@modules/battler/domain/draft";
import { evolves } from "@modules/dex";

// The repository in memory, with the same guard as the SQL: a write lands
// only on the draft as it was read.
const db = vi.hoisted(() => ({
  rows: [] as (RunRow & { playerId: string })[],
}));
vi.mock("@modules/battler/battler.repository", () => {
  // A copy, so the service cannot change a row without saving it.
  const copy = (row: RunRow) => ({ ...row, picks: [...row.picks] });
  return {
    createRun: async (playerId: string, difficulty: RunRow["difficulty"]) => {
      const row = {
        id: crypto.randomUUID(),
        difficulty,
        seed: crypto.randomUUID(),
        picks: [],
        rerolls: 0,
        ordered: false,
        playerId,
      };
      db.rows.push(row);
      return copy(row);
    },
    findRun: async (id: string, playerId: string) => {
      const row = db.rows.find((r) => r.id === id && r.playerId === playerId);
      return row && copy(row);
    },
    findRuns: async (playerId: string) =>
      db.rows.filter((r) => r.playerId === playerId).map(copy),
    saveDraft: async (
      run: RunRow,
      playerId: string,
      next: Pick<RunRow, "picks" | "rerolls" | "ordered">,
    ) => {
      const row = db.rows.find(
        (r) => r.id === run.id && r.playerId === playerId,
      );
      if (
        !row ||
        row.ordered ||
        row.rerolls !== run.rerolls ||
        row.picks.join() !== run.picks.join()
      ) {
        return false;
      }
      Object.assign(row, { ...next, picks: [...next.picks] });
      return true;
    },
  };
});

const PLAYER = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

beforeEach(() => {
  db.rows.length = 0;
});

const started = async (difficulty: RunRow["difficulty"]) =>
  (await startRun(PLAYER, difficulty)) as RunView;

/** Takes the first offer until the team is full. */
async function draft(run: RunView): Promise<RunView> {
  let view = run;
  while (view.stage === "draft") {
    view = (await pick(view.id, PLAYER, view.offers[0]!.slug)) as RunView;
  }
  return view;
}

/** A finished run with the seed and team given, straight into the table. */
function stored(
  seed: string,
  picks: string[],
  difficulty: RunRow["difficulty"] = "hard",
) {
  const row = {
    id: crypto.randomUUID(),
    difficulty,
    seed,
    picks,
    rerolls: 0,
    ordered: true,
    playerId: PLAYER,
  };
  db.rows.push(row);
  return row.id;
}

const STRONG = ["mewtwo", "kyogre", "groudon", "rayquaza", "arceus", "zacian"];

/** The first seed whose bracket the player wins with STRONG. */
async function titleSeed(difficulty: RunRow["difficulty"] = "hard") {
  for (let i = 0; i < 50; i++) {
    const seed = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const id = stored(seed, STRONG, difficulty);
    const run = (await getRun(id, PLAYER))!;
    db.rows.pop();
    if (run.wins === 3) return seed;
  }
  throw new Error("No title in 50 seeds");
}

describe("the draft", () => {
  it("offers as many as the difficulty says, and nothing ahead", async () => {
    const easy = await started("easy");
    expect(easy).toMatchObject({ stage: "draft", picks: [], rerollsLeft: 6 });
    expect(easy.offers).toHaveLength(6);
    expect(easy.rounds).toBeUndefined();
    // The seed draws every offer to come.
    expect(JSON.stringify(easy)).not.toContain(db.rows[0]!.seed);

    const hard = await started("hard");
    expect(hard.offers).toHaveLength(3);
    expect(hard.rerollsLeft).toBe(3);
  });

  it("gives the same offers on every read, and new ones on a reroll", async () => {
    const run = await started("hard");
    expect((await getRun(run.id, PLAYER))!.offers).toEqual(run.offers);

    const rerolled = (await reroll(run.id, PLAYER)) as RunView;
    expect(rerolled.rerollsLeft).toBe(2);
    expect(rerolled.offers).not.toEqual(run.offers);
    expect((await getRun(run.id, PLAYER))!.offers).toEqual(rerolled.offers);
  });

  it("stops rerolls at the cap", async () => {
    const run = await started("hard");
    for (let i = 0; i < 3; i++) await reroll(run.id, PLAYER);
    expect(await reroll(run.id, PLAYER)).toBe("no-rerolls");
  });

  it("takes only a species on offer, and never one twice", async () => {
    const run = await started("easy");
    const offered = run.offers.map((o) => o.slug);
    const other = ["pikachu", "mewtwo", "snorlax"].find(
      (slug) => !offered.includes(slug),
    )!;
    expect(await pick(run.id, PLAYER, other)).toBe("not-offered");

    const next = (await pick(run.id, PLAYER, offered[0]!)) as RunView;
    expect(next.picks.map((p) => p.slug)).toEqual([offered[0]]);
    expect(next.offers.map((o) => o.slug)).not.toContain(offered[0]);
  });

  it("refuses a write that lost a race", async () => {
    const run = await started("easy");
    const [first, second] = run.offers;
    await pick(run.id, PLAYER, first!.slug);
    // The second request read the draft before the first landed.
    db.rows[0]!.picks = [];
    db.rows[0]!.rerolls = 0;
    const raced = await Promise.all([
      pick(run.id, PLAYER, first!.slug),
      pick(run.id, PLAYER, second!.slug),
    ]);
    expect(raced).toContain("conflict");
  });

  it("offers on Nuzlocke only species that evolve no further, 450 or more", async () => {
    stored(await titleSeed(), STRONG);
    const run = await started("nuzlocke");
    expect(run.rerollsLeft).toBe(0);
    for (const offer of run.offers) {
      expect(evolves(offer.slug)).toBe(false);
      expect(offer.total).toBeGreaterThanOrEqual(NUZLOCKE_MIN_TOTAL);
    }
  });

  it("keeps one open draft per difficulty", async () => {
    const run = await started("easy");
    expect((await started("easy")).id).toBe(run.id);
    expect((await started("hard")).id).not.toBe(run.id);
    expect((await getOverview(PLAYER)).open.easy).toBe(run.id);
  });

  it("finds only the player's own runs", async () => {
    const run = await started("easy");
    expect(await getRun(run.id, crypto.randomUUID())).toBeUndefined();
    expect(await getRun("not-a-uuid", PLAYER)).toBeUndefined();
  });
});

describe("the order and the bracket", () => {
  it("asks for the order once the team is full, and only that team", async () => {
    const full = await draft(await started("hard"));
    expect(full).toMatchObject({ stage: "order", offers: [] });
    expect(full.picks).toHaveLength(TEAM_SIZE);
    expect(await pick(full.id, PLAYER, "pikachu")).toBe("over");

    const slugs = full.picks.map((p) => p.slug);
    expect(await order(full.id, PLAYER, [...slugs.slice(1), "pikachu"])).toBe(
      "not-your-team",
    );
    const played = (await order(full.id, PLAYER, slugs.reverse())) as RunView;
    expect(played.stage).toBe("bracket");
    expect(played.picks.map((p) => p.slug)).toEqual(slugs);
  });

  it("plays eight teams over three rounds, the same on every read", async () => {
    const full = await draft(await started("easy"));
    const played = (await order(
      full.id,
      PLAYER,
      full.picks.map((p) => p.slug),
    )) as RunView;
    expect(played.rounds!.map((round) => round.length)).toEqual([4, 2, 1]);
    const yours = played
      .rounds![0]!.flatMap((m) => m.teams)
      .filter((t) => t.you);
    expect(yours).toHaveLength(1);
    // Seven rivals, each with its own leader name from the list.
    const rivals = played
      .rounds![0]!.flatMap((m) => m.teams)
      .filter((t) => !t.you);
    expect(new Set(rivals.map((t) => t.name)).size).toBe(7);
    for (const rival of rivals) expect(RIVAL_NAMES).toContain(rival.name);
    expect(played.wins).toBeGreaterThanOrEqual(0);
    expect(await getRun(full.id, PLAYER)).toEqual(played);
  });

  it("orders a Nuzlocke team as picked, and loses for good whoever faints", async () => {
    stored(await titleSeed(), STRONG);
    expect((await getOverview(PLAYER)).nuzlocke).toBe(true);

    const seed = await titleSeed("nuzlocke");
    const id = stored(seed, STRONG, "nuzlocke");
    const { rounds } = (await getRun(id, PLAYER))!;
    const you = (round: number) =>
      rounds![round]!.flatMap((m) => m.teams).find((t) => t.you)!;
    // Someone fell on the way, or this would prove nothing.
    expect(you(0).members.some((m) => m.fainted)).toBe(true);
    for (const round of [1, 2]) {
      const before = you(round - 1).members.filter((m) => !m.fainted);
      expect(you(round).members.map((m) => m.name)).toEqual(
        before.map((m) => m.name),
      );
    }

    const fresh = await draft(await started("nuzlocke"));
    expect(fresh.stage).toBe("bracket");
  });
});

describe("the Nuzlocke", () => {
  it("is locked until a title on hard", async () => {
    expect((await getOverview(PLAYER)).nuzlocke).toBe(false);
    expect(await startRun(PLAYER, "nuzlocke")).toBe("locked");

    // A title on easy does not count.
    stored(await titleSeed("easy"), STRONG, "easy");
    expect(await startRun(PLAYER, "nuzlocke")).toBe("locked");

    stored(await titleSeed(), STRONG);
    expect((await started("nuzlocke")).stage).toBe("draft");
  });
});
