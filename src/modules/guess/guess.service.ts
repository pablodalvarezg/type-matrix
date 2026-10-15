import { randomInt } from "node:crypto";

import { findSpecies, generationOf, snapshot, stageOf } from "@modules/dex";
import {
  MAX_GUESSES,
  progress,
  type Entry,
  type Progress,
} from "@modules/guess/domain/guess";
import {
  addGuess,
  createGame,
  findDailyGames,
  findGame,
  findHistory,
  giveUp as storeGiveUp,
  type GameRow,
} from "@modules/guess/guess.repository";
import { gameId } from "@modules/guess/guess.schema";
import { stopOf } from "@shared/game";
import { points, streaks } from "@shared/score";

/** Everything a response or a page may carry. No answer until it is over. */
type GameView = Progress & { id: string };

export type GuessError =
  "not-found" | "over" | "unknown" | "repeated" | "conflict";
export type GiveUpError = "not-found" | "over" | "conflict";

/** The guess space for autocomplete. Every name, so it says nothing. */
export const speciesNames = snapshot.species.map((species) => species.name);

// Picked field by field: the species also carries its dex number, slug and
// moves, and nothing about the answer beyond these may reach a response.
// Stored slugs come from the snapshot; a re-ingest that dropped one breaks
// its old games here, loudly.
function entryOf(slug: string): Entry {
  const { id, name, types, color, height, weight } = findSpecies(slug)!;
  return {
    name,
    types,
    generation: generationOf(id),
    stage: stageOf(slug),
    color,
    height,
    weight,
  };
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

/**
 * The free-play games, oldest first, each with its status. As in Hangman,
 * only the last can be open, and a playing game before it lost a race
 * between two starts: it counts as lost.
 * ponytail: it stays playable by its id, and winning it there still counts;
 * check "is it the latest" in guess() if that is ever abused.
 */
async function history(playerId: string) {
  const rows = await findHistory(playerId);
  return rows.map((row, index) => {
    const game = view(row.id, row);
    const superseded = index < rows.length - 1 && game.status === "playing";
    return { ...row, game, status: superseded ? "lost" : game.status };
  });
}

type History = Awaited<ReturnType<typeof history>>;

const openOf = (games: History) => {
  const last = games.at(-1);
  return last?.status === "playing" ? last.game : undefined;
};

const streaksOf = (games: History) =>
  streaks(
    games.flatMap((g) =>
      g.status === "playing"
        ? []
        : g.status === "won"
          ? // A win from before won_at was stamped scores no time bonus.
            [
              points(
                MAX_GUESSES - g.guesses.length,
                g.seconds ?? Number.POSITIVE_INFINITY,
              ),
            ]
          : [null],
    ),
  );

/** The player's free-play streaks: the run still going and their best. */
export async function getStreaks(playerId: string) {
  return streaksOf(await history(playerId));
}

/**
 * What the mode's page shows: the open game and the streaks. A visitor
 * without a cookie has played nothing yet.
 */
export async function getOverview(playerId: string | undefined) {
  const games = playerId ? await history(playerId) : [];
  return { open: openOf(games)?.id, streaks: streaksOf(games) };
}

/** The open game, or a new one: one free-play game at a time. */
export async function startGame(playerId: string): Promise<GameView> {
  const open = openOf(await history(playerId));
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
