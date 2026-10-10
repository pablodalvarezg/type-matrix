import { puzzleParam } from "@modules/daily/daily.schema";
import {
  apart,
  closesAt,
  dailyAnswer,
  isToday,
  puzzleNumber,
  shuffle,
  streaks,
  todayWindow,
} from "@modules/daily/domain/daily";
import { POOL_V1 } from "@modules/daily/domain/pool";
import * as guess from "@modules/guess";
import * as hangman from "@modules/hangman";
import { env } from "@shared/config/env";

export type DailyMode = "guess" | "hangman";

/** A leaderboard row; `score` is guesses or misses, by mode. */
export interface BoardRow {
  place: number;
  nickname: string;
  score: number;
  ms: number;
  you: boolean;
}

interface Game {
  id: string;
  puzzle: number;
  status: "playing" | "won" | "lost";
}

/** What the daily puzzle needs from each mode's module. */
interface Round<G extends Game> {
  answer: (puzzle: number) => string;
  create: (
    playerId: string,
    slug: string,
    puzzle: number,
    closes: Date,
  ) => Promise<void>;
  games: (playerId: string) => Promise<G[]>;
  leaderboard: (puzzle: number, playerId: string) => Promise<BoardRow[]>;
}

export interface Daily<G> {
  game: G;
  streak?: { current: number; best: number };
  leaderboard?: BoardRow[];
  askNickname?: boolean;
}

// answer(n) = order[n mod length], one order per mode. A new pool version
// would take over from a given puzzle number, and older numbers would keep
// resolving here. Hangman's order is kept apart from Stats & types', so the
// two rounds never share a day's species.
const guessOrder = shuffle(POOL_V1, env.DAILY_SECRET, "v1");
const hangmanOrder = apart(
  shuffle(POOL_V1, env.DAILY_SECRET, "hangman-v1"),
  guessOrder,
);

const GUESS: Round<Awaited<ReturnType<typeof guess.getDailyGames>>[number]> = {
  answer: (n) => dailyAnswer(guessOrder, n),
  create: guess.createDailyGame,
  games: guess.getDailyGames,
  leaderboard: async (n, playerId) =>
    (await guess.findLeaderboard(n, playerId)).map(({ guesses, ...row }) => ({
      ...row,
      score: guesses,
    })),
};

const HANGMAN: Round<
  Awaited<ReturnType<typeof hangman.getDailyGames>>[number]
> = {
  answer: (n) => dailyAnswer(hangmanOrder, n),
  create: hangman.createDailyGame,
  games: hangman.getDailyGames,
  leaderboard: async (n, playerId) =>
    (await hangman.getLeaderboard(n, playerId)).map(({ misses, ...row }) => ({
      ...row,
      score: misses,
    })),
};

export type GuessDaily = Daily<Awaited<ReturnType<typeof GUESS.games>>[number]>;
export type HangmanDaily = Daily<
  Awaited<ReturnType<typeof HANGMAN.games>>[number]
>;

/**
 * The server cannot see the player's date, so today is at least the
 * earliest puzzle still open somewhere, or the latest the player has
 * played. ponytail: a puzzle skipped shows as a break up to a day late;
 * the client's date would make it exact.
 */
function streakOf(games: Game[], now: Date) {
  const today = Math.max(
    puzzleNumber(todayWindow(now)[0], env.LAUNCH_DATE),
    ...games.map((g) => g.puzzle),
  );
  const finished = games.filter((g) => g.status !== "playing");
  return streaks(
    finished.map((g) => ({ puzzle: g.puzzle, won: g.status === "won" })),
    today,
  );
}

async function dailyOf<G extends Game>(
  round: Round<G>,
  playerId: string,
  puzzle: number | string,
  now: Date,
): Promise<Daily<G> | undefined> {
  const n = puzzleParam.safeParse(puzzle);
  if (!n.success) return undefined;
  const games = await round.games(playerId);
  const game = games.find((g) => g.puzzle === n.data);
  if (!game || game.status === "playing") return game && { game };

  const leaderboard = await round.leaderboard(n.data, playerId);
  return {
    game,
    streak: streakOf(games, now),
    leaderboard,
    // Every win is on the board once its player has a nickname.
    askNickname: game.status === "won" && !leaderboard.some((row) => row.you),
  };
}

/**
 * The player's game for `puzzle` in `mode`. Once it is over, their streaks
 * in that mode and the puzzle's leaderboard too.
 */
export function getDaily(
  mode: "guess",
  playerId: string,
  puzzle: number | string,
  now?: Date,
): Promise<GuessDaily | undefined>;
export function getDaily(
  mode: "hangman",
  playerId: string,
  puzzle: number | string,
  now?: Date,
): Promise<HangmanDaily | undefined>;
export function getDaily(
  mode: DailyMode,
  playerId: string,
  puzzle: number | string,
  now = new Date(),
) {
  return mode === "guess"
    ? dailyOf(GUESS, playerId, puzzle, now)
    : dailyOf(HANGMAN, playerId, puzzle, now);
}

async function startOf<G extends Game>(
  round: Round<G>,
  playerId: string,
  date: string,
  now: Date,
): Promise<G | "not-today"> {
  const puzzle = puzzleNumber(date, env.LAUNCH_DATE);
  if (puzzle < 1 || !isToday(date, now)) return "not-today";
  await round.create(playerId, round.answer(puzzle), puzzle, closesAt(date));
  // Just the game: streaks and leaderboard are the page's.
  const games = await round.games(playerId);
  return games.find((g) => g.puzzle === puzzle)!;
}

/** Starts, or finds, the player's game in `mode` for their `date`, if it is today. */
export function startDaily(
  mode: DailyMode,
  playerId: string,
  date: string,
  now = new Date(),
) {
  return mode === "guess"
    ? startOf(GUESS, playerId, date, now)
    : startOf(HANGMAN, playerId, date, now);
}

/** The player's current streak in each mode, for the home page. */
export async function getStreaks(
  playerId: string,
  now = new Date(),
): Promise<Record<DailyMode, number>> {
  const [guessGames, hangmanGames] = await Promise.all([
    GUESS.games(playerId),
    HANGMAN.games(playerId),
  ]);
  return {
    guess: streakOf(guessGames, now).current,
    hangman: streakOf(hangmanGames, now).current,
  };
}
