import { randomInt } from "node:crypto";

import { findSpecies, snapshot } from "@modules/dex";
import {
  progress,
  type Progress,
  type Stop,
} from "@modules/hangman/domain/hangman";
import {
  addLetter,
  createGame,
  findDailyGames,
  findGame,
  findLatestGame,
  findWinners,
  giveUp as storeGiveUp,
  type GameRow,
} from "@modules/hangman/hangman.repository";
import { gameId } from "@modules/hangman/hangman.schema";

/** Everything a response or a page may carry. No answer until it is over. */
export type GameView = Progress & { id: string };

export type GuessError = "not-found" | "over" | "repeated" | "conflict";
export type GiveUpError = "not-found" | "over" | "conflict";

// Stored slugs come from the snapshot. A re-ingest that dropped a species
// would break its old games here, loudly.
const nameOf = (slug: string) => findSpecies(slug)!.name;

const stopOf = ({ givenUp, closesAt }: GameRow): Stop | undefined =>
  givenUp
    ? "gave-up"
    : closesAt !== null && closesAt <= new Date()
      ? "closed"
      : undefined;

const view = (id: string, game: GameRow): GameView => ({
  id,
  ...progress(nameOf(game.speciesSlug), game.letters, stopOf(game)),
});

// The player's own game. A malformed id is a miss here, not an SQL error.
const load = async (id: string, playerId: string) =>
  gameId.safeParse(id).success ? findGame(id, playerId) : undefined;

/** The player's free-play game still being played, if there is one. */
export async function getOpenGame(
  playerId: string,
): Promise<GameView | undefined> {
  const latest = await findLatestGame(playerId);
  const game = latest && view(latest.id, latest);
  return game?.status === "playing" ? game : undefined;
}

/** The open game, or a new one: one free-play game at a time. */
export async function startGame(playerId: string): Promise<GameView> {
  const open = await getOpenGame(playerId);
  if (open) return open;
  const species = snapshot.species[randomInt(snapshot.species.length)]!;
  const id = await createGame(playerId, species.slug);
  return view(id, {
    speciesSlug: species.slug,
    letters: "",
    closesAt: null,
    givenUp: false,
  });
}

/** The player's own game, or undefined for any other id. */
export async function getGame(
  id: string,
  playerId: string,
): Promise<GameView | undefined> {
  const game = await load(id, playerId);
  return game && view(id, game);
}

export async function guess(
  id: string,
  playerId: string,
  letter: string,
): Promise<GameView | GuessError> {
  const game = await load(id, playerId);
  if (!game) return "not-found";

  if (view(id, game).status !== "playing") return "over";
  if (game.letters.includes(letter)) return "repeated";
  const next = { ...game, letters: game.letters + letter };
  const after = view(id, next);
  if (
    !(await addLetter(
      id,
      playerId,
      game.letters,
      letter,
      after.status === "won",
    ))
  ) {
    return "conflict";
  }
  return after;
}

/** Ends the game as lost; the response is the first to carry the answer. */
export async function giveUp(
  id: string,
  playerId: string,
): Promise<GameView | GiveUpError> {
  const game = await load(id, playerId);
  if (!game) return "not-found";
  if (view(id, game).status !== "playing") return "over";
  if (!(await storeGiveUp(id, playerId, game.letters))) return "conflict";
  return view(id, { ...game, givenUp: true });
}

/** The player's daily games, each with its puzzle number. */
export async function getDailyGames(
  playerId: string,
): Promise<(GameView & { puzzle: number })[]> {
  const games = await findDailyGames(playerId);
  return games.map((game) => ({ puzzle: game.puzzle, ...view(game.id, game) }));
}

/** A puzzle's leaderboard, misses counted from each winner's letters. */
export async function getLeaderboard(puzzle: number, playerId: string) {
  const winners = await findWinners(puzzle, playerId);
  return winners.map(({ speciesSlug, letters, ...row }) => ({
    ...row,
    misses: progress(nameOf(speciesSlug), letters).wrong.length,
  }));
}
