import { randomInt } from "node:crypto";

import { findSpecies, GENERATIONS, generationOf, snapshot } from "@modules/dex";
import {
  campaign,
  canPick,
  type Campaign,
} from "@modules/hangman/domain/campaign";
import { progress, type Progress } from "@modules/hangman/domain/hangman";
import { points, streaks } from "@modules/hangman/domain/score";
import {
  addLetter,
  createGame,
  findDailyGames,
  findGame,
  findHistory,
  findWinners,
  giveUp as storeGiveUp,
  type GameRow,
  type Kind,
} from "@modules/hangman/hangman.repository";
import { gameId } from "@modules/hangman/hangman.schema";
import { stopOf } from "@shared/game";

/** Everything a response or a page may carry. No answer until it is over. */
export type GameView = Progress & { id: string };

export type GuessError = "not-found" | "over" | "repeated" | "conflict";
export type GiveUpError = "not-found" | "over" | "conflict";

// Stored slugs come from the snapshot. A re-ingest that dropped a species
// would break its old games here, loudly.
const nameOf = (slug: string) => findSpecies(slug)!.name;

const view = (id: string, game: GameRow): GameView => ({
  id,
  ...progress(nameOf(game.speciesSlug), game.letters, stopOf(game)),
});

// The player's own game. A malformed id is a miss here, not an SQL error.
const load = async (id: string, playerId: string) =>
  gameId.safeParse(id).success ? findGame(id, playerId) : undefined;

/**
 * A mode's games, oldest first, each with its status. Only the last can be
 * open: a new game is made only once the last is over. A playing game before
 * it lost a race between two starts and is never offered again, so it counts
 * as lost; otherwise abandoning it would be a free reroll.
 * ponytail: it stays playable by its id, and winning it there still counts;
 * check "is it the latest" in guess() if that is ever abused.
 */
async function history(playerId: string, isCampaign: boolean) {
  const rows = await findHistory(playerId, isCampaign);
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

const campaignOf = (games: History) =>
  campaign(
    games.flatMap((g) => (g.status === "playing" ? [] : [g.status === "won"])),
    GENERATIONS,
  );

const streaksOf = (games: History) =>
  streaks(
    games.flatMap((g) =>
      g.status === "playing"
        ? []
        : g.status === "won"
          ? // A win from before won_at was stamped scores no time bonus.
            [points(g.game.wrong.length, g.seconds ?? Number.POSITIVE_INFINITY)]
          : [null],
    ),
  );

/** Where the player's campaign stands. */
export async function getCampaign(playerId: string): Promise<Campaign> {
  return campaignOf(await history(playerId, true));
}

/** The player's free-play streaks: the run still going and their best. */
export async function getStreaks(playerId: string) {
  return streaksOf(await history(playerId, false));
}

/**
 * What the mode's page shows: each mode's open game, the campaign and the
 * free-play streaks. A visitor without a cookie has played nothing yet.
 */
export async function getOverview(playerId: string | undefined) {
  const [campaignGames, freeGames] = playerId
    ? await Promise.all([history(playerId, true), history(playerId, false)])
    : [[], []];
  return {
    campaign: campaignOf(campaignGames),
    streaks: streaksOf(freeGames),
    open: {
      campaign: openOf(campaignGames)?.id,
      free: openOf(freeGames)?.id,
    },
  };
}

export type StartError = "locked" | "campaign-done";

/**
 * The open game of that mode, or a new one: one at a time per mode. A
 * campaign game draws from the generation being played; a free-play one
 * from every species, or from the generations the campaign has unlocked.
 */
export async function startGame(
  playerId: string,
  { campaign: isCampaign, gen }: { campaign: boolean; gen: number[] },
): Promise<GameView | StartError> {
  const games = await history(playerId, isCampaign);
  const open = openOf(games);
  if (open) return open;

  let gens: number[];
  if (isCampaign) {
    const { current } = campaignOf(games);
    if (current === null) return "campaign-done";
    gens = [current];
  } else {
    // Every species needs no campaign; a limit is checked against it.
    if (
      gen.length > 0 &&
      !canPick(gen, campaignOf(await history(playerId, true)), GENERATIONS)
    ) {
      return "locked";
    }
    gens = gen;
  }

  const pool = gens.length
    ? snapshot.species.filter((s) => gens.includes(generationOf(s.id)))
    : snapshot.species;
  const species = pool[randomInt(pool.length)]!;
  const id = await createGame(playerId, species.slug, {
    campaign: isCampaign,
    gens: isCampaign || !gens.length ? null : gens,
  });
  return view(id, {
    speciesSlug: species.slug,
    letters: "",
    closesAt: null,
    givenUp: false,
  });
}

/**
 * The player's own game and its mode, or undefined for any other id. The
 * mode is not the answer: the page needs it to offer the next game.
 */
export async function getGame(
  id: string,
  playerId: string,
): Promise<(GameView & Kind) | undefined> {
  const game = await load(id, playerId);
  return (
    game && { ...view(id, game), campaign: game.campaign, gens: game.gens }
  );
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
