import { randomInt } from "node:crypto";

import { findSpecies, snapshot } from "@modules/dex";
import {
  progress,
  type Entry,
  type Progress,
} from "@modules/guess/domain/guess";
import {
  addGuess,
  createGame,
  findDailyGames,
  findGame,
  findLatestGame,
  giveUp as storeGiveUp,
  type GameRow,
} from "@modules/guess/guess.repository";
import { gameId } from "@modules/guess/guess.schema";
import { stopOf } from "@shared/game";

/** Everything a response or a page may carry. No answer until it is over. */
type GameView = Progress & { id: string };

export type GuessError =
  "not-found" | "over" | "unknown" | "repeated" | "conflict";
export type GiveUpError = "not-found" | "over" | "conflict";

/** The guess space for autocomplete. Every name, so it says nothing. */
export const speciesNames = snapshot.species.map((species) => species.name);

// Picked field by field: the species also carries its dex number and moves,
// and nothing about the answer beyond these may reach a response.
// Stored slugs come from the snapshot; a re-ingest that dropped one breaks
// its old games here, loudly.
function entryOf(slug: string): Entry {
  const { name, types, stats } = findSpecies(slug)!;
  return { name, types, stats };
}

const view = (id: string, game: GameRow): GameView => ({
  id,
  ...progress(
    entryOf(game.speciesSlug),
    game.guesses.map(entryOf),
    stopOf(game),
  ),
});

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
    guesses: [],
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

/** The player's daily games, each with its puzzle number. */
export async function getDailyGames(
  playerId: string,
): Promise<(GameView & { puzzle: number })[]> {
  const games = await findDailyGames(playerId);
  return games.map((game) => ({
    puzzle: game.puzzle,
    ...view(game.id, game),
  }));
}

/** `query` is a name or slug as typed. An unknown one costs nothing. */
export async function guess(
  id: string,
  playerId: string,
  query: string,
): Promise<GameView | GuessError> {
  const game = await load(id, playerId);
  if (!game) return "not-found";

  if (view(id, game).status !== "playing") return "over";
  const species = findSpecies(query);
  if (!species) return "unknown";
  if (game.guesses.includes(species.slug)) return "repeated";
  if (!(await addGuess(id, playerId, game.guesses.length, species.slug))) {
    return "conflict";
  }
  return view(id, { ...game, guesses: [...game.guesses, species.slug] });
}

/** Ends the game as lost; the response is the first to carry the answer. */
export async function giveUp(
  id: string,
  playerId: string,
): Promise<GameView | GiveUpError> {
  const game = await load(id, playerId);
  if (!game) return "not-found";
  if (view(id, game).status !== "playing") return "over";
  if (!(await storeGiveUp(id, playerId, game.guesses.length))) {
    return "conflict";
  }
  return view(id, { ...game, givenUp: true });
}
