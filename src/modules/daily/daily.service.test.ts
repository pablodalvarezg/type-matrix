import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDaily, getStreaks, startDaily } from "@modules/daily/daily.service";
import { apart, shuffle } from "@modules/daily/domain/daily";
import { POOL_V1 } from "@modules/daily/domain/pool";
import { snapshot } from "@modules/dex";

const guess = vi.hoisted(() => ({
  createDailyGame: vi.fn(),
  findLeaderboard: vi.fn(),
  getDailyGames: vi.fn(),
}));
const hangman = vi.hoisted(() => ({
  createDailyGame: vi.fn(),
  getLeaderboard: vi.fn(),
  getDailyGames: vi.fn(),
}));
vi.mock("@modules/guess", () => guess);
vi.mock("@modules/hangman", () => hangman);
vi.mock("@shared/config/env", () => ({
  env: { DAILY_SECRET: "d".repeat(32), LAUNCH_DATE: "2026-10-01" },
}));

const PLAYER = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
// 10:00 UTC: today is the 8th, 9th or 10th somewhere, puzzles 8 to 10.
const NOW = new Date("2026-10-09T10:00:00Z");

const game = (puzzle: number, status: string) => ({ puzzle, status });

beforeEach(() => {
  vi.clearAllMocks();
  guess.getDailyGames.mockResolvedValue([game(9, "playing")]);
  guess.findLeaderboard.mockResolvedValue([]);
  hangman.getDailyGames.mockResolvedValue([]);
  hangman.getLeaderboard.mockResolvedValue([]);
});

describe("POOL_V1", () => {
  it("is every species in the snapshot, once", () => {
    expect(POOL_V1).toEqual(snapshot.species.map((s) => s.slug));
  });
});

describe("startDaily", () => {
  it("makes the game for the puzzle of the player's date", async () => {
    const order = shuffle(POOL_V1, "d".repeat(32), "v1");
    expect(await startDaily("guess", PLAYER, "2026-10-09", NOW)).toEqual(
      game(9, "playing"),
    );
    expect(guess.createDailyGame).toHaveBeenCalledWith(
      PLAYER,
      order[9],
      9,
      new Date("2026-10-10T12:00:00Z"),
    );
  });

  it.each(["2026-10-07", "2026-10-11"])(
    "refuses %s, today nowhere",
    async (date) => {
      expect(await startDaily("guess", PLAYER, date, NOW)).toBe("not-today");
      expect(guess.createDailyGame).not.toHaveBeenCalled();
    },
  );

  it("refuses a date before launch", async () => {
    const early = new Date("2026-09-30T10:00:00Z");
    expect(await startDaily("guess", PLAYER, "2026-09-30", early)).toBe(
      "not-today",
    );
  });
});

describe("getDaily", () => {
  it("finds only the player's game for that puzzle", async () => {
    expect(await getDaily("guess", PLAYER, "9", NOW)).toEqual({
      game: game(9, "playing"),
    });
    expect(await getDaily("guess", PLAYER, "8", NOW)).toBeUndefined();
    expect(await getDaily("guess", PLAYER, "nine", NOW)).toBeUndefined();
  });

  it("adds the streaks once the game is over", async () => {
    guess.getDailyGames.mockResolvedValue([
      game(6, "won"),
      game(7, "won"),
      game(8, "won"),
      game(9, "won"),
      game(4, "won"),
    ]);
    expect(await getDaily("guess", PLAYER, 9, NOW)).toMatchObject({
      streak: { current: 4, best: 4 },
    });
  });

  it("adds the puzzle's leaderboard once the game is over", async () => {
    expect(await getDaily("guess", PLAYER, 9, NOW)).not.toHaveProperty(
      "leaderboard",
    );
    expect(guess.findLeaderboard).not.toHaveBeenCalled();

    const row = { place: 1, nickname: "ash", guesses: 3, ms: 1, you: true };
    guess.getDailyGames.mockResolvedValue([game(9, "won")]);
    guess.findLeaderboard.mockResolvedValue([row]);
    expect(await getDaily("guess", PLAYER, 9, NOW)).toMatchObject({
      leaderboard: [{ place: 1, nickname: "ash", score: 3, ms: 1, you: true }],
      askNickname: false,
    });
    expect(guess.findLeaderboard).toHaveBeenCalledWith(9, PLAYER);
  });

  it("asks a winner off the board for a nickname, and only a winner", async () => {
    guess.getDailyGames.mockResolvedValue([game(9, "won")]);
    expect(await getDaily("guess", PLAYER, 9, NOW)).toMatchObject({
      askNickname: true,
    });
    guess.getDailyGames.mockResolvedValue([game(9, "lost")]);
    expect(await getDaily("guess", PLAYER, 9, NOW)).toMatchObject({
      askNickname: false,
    });
  });

  it("shows the same streak from an older puzzle's page", async () => {
    // A player east of UTC−12 has already won 10, today for them.
    guess.getDailyGames.mockResolvedValue([
      game(8, "won"),
      game(9, "won"),
      game(10, "won"),
    ]);
    expect((await getDaily("guess", PLAYER, 9, NOW))?.streak?.current).toBe(3);
  });

  it("breaks the streak on a puzzle no longer open anywhere", async () => {
    // Puzzle 8 is still today in UTC−12, so 7 alone keeps the run alive;
    // from 12:00 UTC on, today is at least 9 everywhere and 8 was skipped.
    guess.getDailyGames.mockResolvedValue([game(6, "won"), game(7, "won")]);
    expect((await getDaily("guess", PLAYER, 7, NOW))?.streak?.current).toBe(2);
    const later = new Date("2026-10-09T12:00:00Z");
    expect((await getDaily("guess", PLAYER, 7, later))?.streak?.current).toBe(
      0,
    );
  });
});

describe("the Hangman round", () => {
  it("gets its own species, never the Stats & types one of that day", async () => {
    const guessOrder = shuffle(POOL_V1, "d".repeat(32), "v1");
    const order = apart(
      shuffle(POOL_V1, "d".repeat(32), "hangman-v1"),
      guessOrder,
    );
    hangman.getDailyGames.mockResolvedValue([game(9, "playing")]);
    await startDaily("hangman", PLAYER, "2026-10-09", NOW);
    const [, slug] = hangman.createDailyGame.mock.calls[0]!;
    expect(slug).toBe(order[9]);
    expect(slug).not.toBe(guessOrder[9]);
    expect(guess.createDailyGame).not.toHaveBeenCalled();
  });

  it("ranks by misses, and keeps its streak apart", async () => {
    const row = { place: 1, nickname: "ash", misses: 2, ms: 1, you: true };
    hangman.getDailyGames.mockResolvedValue([game(8, "won"), game(9, "won")]);
    hangman.getLeaderboard.mockResolvedValue([row]);
    expect(await getDaily("hangman", PLAYER, 9, NOW)).toMatchObject({
      streak: { current: 2 },
      leaderboard: [{ place: 1, nickname: "ash", score: 2, ms: 1, you: true }],
    });
    expect(guess.findLeaderboard).not.toHaveBeenCalled();
  });
});

describe("getStreaks", () => {
  it("gives the current streak of each round", async () => {
    guess.getDailyGames.mockResolvedValue([game(8, "won"), game(9, "won")]);
    hangman.getDailyGames.mockResolvedValue([game(8, "won"), game(9, "lost")]);
    expect(await getStreaks(PLAYER, NOW)).toEqual({ guess: 2, hangman: 0 });
  });
});
