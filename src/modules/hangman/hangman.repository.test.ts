import { describe, expect, it, vi } from "vitest";

import {
  addLetter,
  createGame,
  findGame,
} from "@modules/hangman/hangman.repository";

const sql = vi.hoisted(() => vi.fn());
vi.mock("@shared/db/client", () => ({ sql }));

// The SQL itself was checked against Neon; these pin what the rows map to.
const GAME = "3f2b8c1e-5d4a-4e6f-9b7c-0a1d2e3f4a5b";
const PLAYER = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("hangman repository", () => {
  it("returns the id of the game it creates", async () => {
    sql.mockResolvedValueOnce([{ id: GAME }]);
    expect(await createGame(PLAYER, "pikachu")).toBe(GAME);
  });

  it("maps a stored game", async () => {
    sql.mockResolvedValueOnce([{ species_slug: "mr-mime", letters: "me" }]);
    expect(await findGame(GAME, PLAYER)).toEqual({
      speciesSlug: "mr-mime",
      letters: "me",
    });
  });

  it("finds nothing for another player's game", async () => {
    sql.mockResolvedValueOnce([]);
    expect(await findGame(GAME, PLAYER)).toBeUndefined();
  });

  it("appends the letter when nobody got there first", async () => {
    sql.mockResolvedValueOnce([{ id: GAME }]);
    expect(await addLetter(GAME, PLAYER, "me", "r")).toBe(true);
  });

  it("refuses the letter when the stored letters changed", async () => {
    sql.mockResolvedValueOnce([]);
    expect(await addLetter(GAME, PLAYER, "me", "r")).toBe(false);
  });
});
