import { describe, expect, it, vi } from "vitest";

import {
  addLetter,
  createGame,
  findGame,
  findHistory,
  findWinners,
  giveUp,
} from "@modules/hangman/hangman.repository";

const sql = vi.hoisted(() => vi.fn());
vi.mock("@shared/db/client", () => ({ sql }));

// The SQL itself was checked against Neon; these pin what the rows map to.
const GAME = "3f2b8c1e-5d4a-4e6f-9b7c-0a1d2e3f4a5b";
const PLAYER = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("hangman repository", () => {
  it("returns the id of the game it creates", async () => {
    sql.mockResolvedValueOnce([{ id: GAME }]);
    expect(
      await createGame(PLAYER, "pikachu", { campaign: false, gens: [2] }),
    ).toBe(GAME);
  });

  it("maps a stored game", async () => {
    sql.mockResolvedValueOnce([
      {
        species_slug: "mr-mime",
        letters: "me",
        closes_at: null,
        given_up_at: null,
        campaign: false,
        gens: [1, 4],
      },
    ]);
    expect(await findGame(GAME, PLAYER)).toEqual({
      speciesSlug: "mr-mime",
      letters: "me",
      closesAt: null,
      givenUp: false,
      campaign: false,
      gens: [1, 4],
    });
  });

  it("maps the history, with the seconds to win or null", async () => {
    sql.mockResolvedValueOnce([
      {
        id: GAME,
        species_slug: "mew",
        letters: "mew",
        closes_at: null,
        given_up_at: null,
        seconds: 41,
      },
      {
        id: GAME,
        species_slug: "mew",
        letters: "a",
        closes_at: null,
        given_up_at: "2026-10-09T10:00:00Z",
        seconds: null,
      },
    ]);
    expect(await findHistory(PLAYER, true)).toEqual([
      {
        id: GAME,
        speciesSlug: "mew",
        letters: "mew",
        closesAt: null,
        givenUp: false,
        seconds: 41,
      },
      {
        id: GAME,
        speciesSlug: "mew",
        letters: "a",
        closesAt: null,
        givenUp: true,
        seconds: null,
      },
    ]);
  });

  it("finds nothing for another player's game", async () => {
    sql.mockResolvedValueOnce([]);
    expect(await findGame(GAME, PLAYER)).toBeUndefined();
  });

  it("appends the letter when nobody got there first", async () => {
    sql.mockResolvedValueOnce([{ id: GAME }]);
    expect(await addLetter(GAME, PLAYER, "me", "r", false)).toBe(true);
  });

  it("refuses the letter when the stored letters changed", async () => {
    sql.mockResolvedValueOnce([]);
    expect(await addLetter(GAME, PLAYER, "me", "r", false)).toBe(false);
  });

  it("gives up only when no letter landed first", async () => {
    sql.mockResolvedValueOnce([{ id: GAME }]).mockResolvedValueOnce([]);
    expect(await giveUp(GAME, PLAYER, "me")).toBe(true);
    expect(await giveUp(GAME, PLAYER, "me")).toBe(false);
  });

  it("maps the winners with what their misses come from", async () => {
    const row = {
      place: 1,
      nickname: "ash",
      species_slug: "mew",
      letters: "amew",
      ms: 9000,
      you: true,
    };
    sql.mockResolvedValueOnce([row]);
    expect(await findWinners(3, PLAYER)).toEqual([
      {
        place: 1,
        nickname: "ash",
        speciesSlug: "mew",
        letters: "amew",
        ms: 9000,
        you: true,
      },
    ]);
  });
});
