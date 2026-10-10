import { sql } from "@shared/db/client";

export interface GameRow {
  speciesSlug: string;
  guesses: string[];
  /** Daily games only: when the puzzle stops being today anywhere. */
  closesAt: Date | null;
  givenUp: boolean;
}

const closesAt = (value: unknown) => (value ? new Date(value as string) : null);

type Row = Record<string, unknown>;
const gameRow = (row: Row): GameRow => ({
  speciesSlug: row.species_slug as string,
  guesses: row.guesses as string[],
  closesAt: closesAt(row.closes_at),
  givenUp: row.given_up_at != null,
});

/** Creates the game, and the player too if this is their first save. */
export async function createGame(
  playerId: string,
  speciesSlug: string,
): Promise<string> {
  const [row] = await sql`
    WITH player AS (
      INSERT INTO players (id) VALUES (${playerId}) ON CONFLICT (id) DO NOTHING
    )
    INSERT INTO guess_games (player_id, species_slug)
    VALUES (${playerId}, ${speciesSlug})
    RETURNING id`;
  return row!.id as string;
}

/** Only the player who started a game can find it. */
export async function findGame(
  id: string,
  playerId: string,
): Promise<GameRow | undefined> {
  const [row] = await sql`
    SELECT species_slug, guesses, closes_at, given_up_at FROM guess_games
    WHERE id = ${id} AND player_id = ${playerId}`;
  return row && gameRow(row);
}

/**
 * The player's latest free-play game. Only it can still be open: a new one
 * is made only once it is over.
 */
export async function findLatestGame(
  playerId: string,
): Promise<(GameRow & { id: string }) | undefined> {
  const [row] = await sql`
    SELECT id, species_slug, guesses, closes_at, given_up_at FROM guess_games
    WHERE player_id = ${playerId} AND puzzle IS NULL
    ORDER BY created_at DESC LIMIT 1`;
  return row && { id: row.id as string, ...gameRow(row) };
}

/**
 * Appends a guess only if no other one landed since `count` guesses were
 * read and the game was not given up, so two at once cannot both pass the
 * cap and a give-up cannot be overtaken. False if either happened. The
 * winning guess stamps `won_at`: the last one, since a won game takes none.
 */
export async function addGuess(
  id: string,
  playerId: string,
  count: number,
  slug: string,
): Promise<boolean> {
  const rows = await sql`
    UPDATE guess_games SET guesses = array_append(guesses, ${slug}),
      won_at = CASE WHEN species_slug = ${slug} THEN now() END
    WHERE id = ${id} AND player_id = ${playerId}
      AND cardinality(guesses) = ${count} AND given_up_at IS NULL
    RETURNING id`;
  return rows.length === 1;
}

/** Gives the game up, unless a guess landed since `count` were read. */
export async function giveUp(
  id: string,
  playerId: string,
  count: number,
): Promise<boolean> {
  const rows = await sql`
    UPDATE guess_games SET given_up_at = now()
    WHERE id = ${id} AND player_id = ${playerId}
      AND cardinality(guesses) = ${count} AND given_up_at IS NULL
    RETURNING id`;
  return rows.length === 1;
}

/** The player's game for a daily puzzle, made on the first call only. */
export async function createDailyGame(
  playerId: string,
  speciesSlug: string,
  puzzle: number,
  closes: Date,
): Promise<void> {
  await sql`
    WITH player AS (
      INSERT INTO players (id) VALUES (${playerId}) ON CONFLICT (id) DO NOTHING
    )
    INSERT INTO guess_games (player_id, species_slug, puzzle, closes_at)
    VALUES (${playerId}, ${speciesSlug}, ${puzzle}, ${closes})
    ON CONFLICT (player_id, puzzle) DO NOTHING`;
}

/** Every daily game of the player: a few hundred rows after a year. */
export async function findDailyGames(
  playerId: string,
): Promise<(GameRow & { id: string; puzzle: number })[]> {
  const rows = await sql`
    SELECT id, puzzle, species_slug, guesses, closes_at, given_up_at
    FROM guess_games
    WHERE player_id = ${playerId} AND puzzle IS NOT NULL`;
  return rows.map((row) => ({
    id: row.id as string,
    puzzle: row.puzzle as number,
    ...gameRow(row),
  }));
}

export interface LeaderboardRow {
  place: number;
  nickname: string;
  guesses: number;
  /** From the game's creation to its winning guess, by the database. */
  ms: number;
  you: boolean;
}

/**
 * The puzzle's winners with a nickname: fewest guesses, then shortest time.
 * The top 10, and the player's own row wherever it falls.
 * ponytail: no index on `puzzle`, a scan of every game; add one when the
 * table holds enough rows to notice.
 */
export async function findLeaderboard(
  puzzle: number,
  playerId: string,
): Promise<LeaderboardRow[]> {
  const rows = await sql`
    WITH ranked AS (
      SELECT g.player_id, p.nickname,
        cardinality(g.guesses) AS guesses,
        round(extract(epoch FROM g.won_at - g.created_at) * 1000)::int AS ms,
        row_number() OVER (
          ORDER BY cardinality(g.guesses), g.won_at - g.created_at, g.id
        )::int AS place
      FROM guess_games g JOIN players p ON p.id = g.player_id
      WHERE g.puzzle = ${puzzle} AND g.won_at IS NOT NULL
        AND p.nickname IS NOT NULL
    )
    SELECT place, nickname, guesses, ms, player_id = ${playerId} AS you
    FROM ranked WHERE place <= 10 OR player_id = ${playerId}
    ORDER BY place`;
  return rows as LeaderboardRow[];
}
