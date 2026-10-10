import { describe, expect, it, vi } from "vitest";

import {
  addGuess,
  createGame,
  findDailyGames,
  findGame,
  giveUp,
} from "@modules/guess/guess.repository";

const sql = vi.hoisted(() => vi.fn());
vi.mock("@shared/db/client", () => ({ sql }));

// The SQL itself was checked against Neon; these pin what the rows map to.
const GAME = "3f2b8c1e-5d4a-4e6f-9b7c-0a1d2e3f4a5b";
const PLAYER = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("guess repository", () => {
  it("returns the id of the game it creates", async () => {
    sql.mockResolvedValueOnce([{ id: GAME }]);
    expect(await createGame(PLAYER, "pikachu")).toBe(GAME);
  });

  it("maps a stored game", async () => {
    sql.mockResolvedValueOnce([
      {
        species_slug: "mr-mime",
        guesses: ["bulbasaur", "ivysaur"],
        closes_at: null,
        given_up_at: null,
      },
    ]);
    expect(await findGame(GAME, PLAYER)).toEqual({
      speciesSlug: "mr-mime",
      guesses: ["bulbasaur", "ivysaur"],
      closesAt: null,
      givenUp: false,
    });
  });

  it("finds nothing for another player's game", async () => {
    sql.mockResolvedValueOnce([]);
    expect(await findGame(GAME, PLAYER)).toBeUndefined();
  });

  it("appends the guess when nobody got there first", async () => {
    sql.mockResolvedValueOnce([{ id: GAME }]);
    expect(await addGuess(GAME, PLAYER, 2, "venusaur")).toBe(true);
  });

  it("refuses the guess when another one landed first", async () => {
    sql.mockResolvedValueOnce([]);
    expect(await addGuess(GAME, PLAYER, 2, "venusaur")).toBe(false);
  });

  it("gives up only when no guess landed first", async () => {
    sql.mockResolvedValueOnce([{ id: GAME }]).mockResolvedValueOnce([]);
    expect(await giveUp(GAME, PLAYER, 2)).toBe(true);
    expect(await giveUp(GAME, PLAYER, 2)).toBe(false);
  });

  it("maps the player's daily games", async () => {
    sql.mockResolvedValueOnce([
      {
        id: GAME,
        puzzle: 9,
        species_slug: "mr-mime",
        guesses: ["bulbasaur"],
        closes_at: new Date("2026-10-10T12:00:00Z"),
        given_up_at: new Date("2026-10-09T13:00:00Z"),
      },
    ]);
    expect(await findDailyGames(PLAYER)).toEqual([
      {
        id: GAME,
        puzzle: 9,
        speciesSlug: "mr-mime",
        guesses: ["bulbasaur"],
        closesAt: new Date("2026-10-10T12:00:00Z"),
        givenUp: true,
      },
    ]);
  });
});
