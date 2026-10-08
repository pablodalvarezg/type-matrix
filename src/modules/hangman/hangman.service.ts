import { randomInt } from "node:crypto";

import { findSpecies, snapshot } from "@modules/dex";
import { progress, type Progress } from "@modules/hangman/domain/hangman";
import {
  addLetter,
  createGame,
  findGame,
} from "@modules/hangman/hangman.repository";
import { gameId } from "@modules/hangman/hangman.schema";

/** Everything a response or a page may carry. No answer until it is over. */
export type GameView = Progress & { id: string };

export type GuessError = "not-found" | "over" | "repeated" | "conflict";

// Stored slugs come from the snapshot. A re-ingest that dropped a species
// would break its old games here, loudly.
const nameOf = (slug: string) => findSpecies(slug)!.name;

const view = (id: string, slug: string, letters: string): GameView => ({
  id,
  ...progress(nameOf(slug), letters),
});

// The player's own game. A malformed id is a miss here, not an SQL error.
const load = async (id: string, playerId: string) =>
  gameId.safeParse(id).success ? findGame(id, playerId) : undefined;

export async function startGame(playerId: string): Promise<GameView> {
  const species = snapshot.species[randomInt(snapshot.species.length)]!;
  const id = await createGame(playerId, species.slug);
  return view(id, species.slug, "");
}

/** The player's own game, or undefined for any other id. */
export async function getGame(
  id: string,
  playerId: string,
): Promise<GameView | undefined> {
  const game = await load(id, playerId);
  return game && view(id, game.speciesSlug, game.letters);
}

export async function guess(
  id: string,
  playerId: string,
  letter: string,
): Promise<GameView | GuessError> {
  const game = await load(id, playerId);
  if (!game) return "not-found";

  const { speciesSlug: slug, letters } = game;
  if (progress(nameOf(slug), letters).status !== "playing") return "over";
  if (letters.includes(letter)) return "repeated";
  if (!(await addLetter(id, playerId, letters, letter))) return "conflict";

  return view(id, slug, letters + letter);
}
