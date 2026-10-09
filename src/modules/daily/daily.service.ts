import { puzzleParam } from "@modules/daily/daily.schema";
import {
  closesAt,
  isToday,
  puzzleNumber,
  shuffle,
  streaks,
  todayWindow,
} from "@modules/daily/domain/daily";
import { POOL_V1 } from "@modules/daily/domain/pool";
import {
  createDailyGame,
  findLeaderboard,
  getDailyGames,
  type LeaderboardRow,
} from "@modules/guess";
import { env } from "@shared/config/env";

type DailyGame = Awaited<ReturnType<typeof getDailyGames>>[number];
export interface Daily {
  game: DailyGame;
  streak?: { current: number; best: number };
  leaderboard?: LeaderboardRow[];
  askNickname?: boolean;
}

// answer(n) = order[n mod length]. A new pool version would take over from a
// given puzzle number, and older numbers would keep resolving here.
const order = shuffle(POOL_V1, env.DAILY_SECRET, "v1");

/**
 * The player's game for `puzzle`. Once it is over, their streaks and the
 * puzzle's leaderboard too.
 */
export async function getDaily(
  playerId: string,
  puzzle: number | string,
  now = new Date(),
): Promise<Daily | undefined> {
  const n = puzzleParam.safeParse(puzzle);
  if (!n.success) return undefined;
  const games = await getDailyGames(playerId);
  const game = games.find((g) => g.puzzle === n.data);
  if (!game || game.status === "playing") return game && { game };

  // The server cannot see the player's date, so today is at least the
  // earliest puzzle still open somewhere, or the latest the player has
  // played. ponytail: a puzzle skipped shows as a break up to a day late;
  // the client's date would make it exact.
  const today = Math.max(
    puzzleNumber(todayWindow(now)[0], env.LAUNCH_DATE),
    ...games.map((g) => g.puzzle),
  );
  const finished = games.filter((g) => g.status !== "playing");
  const leaderboard = await findLeaderboard(n.data, playerId);
  return {
    game,
    streak: streaks(
      finished.map((g) => ({ puzzle: g.puzzle, won: g.status === "won" })),
      today,
    ),
    leaderboard,
    // Every win is on the board once its player has a nickname.
    askNickname: game.status === "won" && !leaderboard.some((row) => row.you),
  };
}

/** Starts, or finds, the player's game for their `date`, if it is today. */
export async function startDaily(
  playerId: string,
  date: string,
  now = new Date(),
): Promise<DailyGame | "not-today"> {
  const puzzle = puzzleNumber(date, env.LAUNCH_DATE);
  if (puzzle < 1 || !isToday(date, now)) return "not-today";
  await createDailyGame(
    playerId,
    order[puzzle % order.length]!,
    puzzle,
    closesAt(date),
  );
  return (await getDaily(playerId, puzzle, now))!.game;
}
