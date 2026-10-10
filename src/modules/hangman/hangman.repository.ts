import { sql } from "@shared/db/client";

export interface GameRow {
  speciesSlug: string;
  letters: string;
  /** Daily games only: when the puzzle stops being today anywhere. */
  closesAt: Date | null;
  givenUp: boolean;
}

const closesAt = (value: unknown) => (value ? new Date(value as string) : null);

type Row = Record<string, unknown>;
const gameRow = (row: Row): GameRow => ({
  speciesSlug: row.species_slug as string,
  letters: row.letters as string,
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
    INSERT INTO hangman_games (player_id, species_slug)
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
    SELECT species_slug, letters, closes_at, given_up_at FROM hangman_games
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
    SELECT id, species_slug, letters, closes_at, given_up_at
    FROM hangman_games
    WHERE player_id = ${playerId} AND puzzle IS NULL
    ORDER BY created_at DESC LIMIT 1`;
  return row && { id: row.id as string, ...gameRow(row) };
}

/**
 * Appends a letter only if nobody else did since `letters` was read and the
 * game was not given up, so two guesses at once cannot both pass the cap and
 * a give-up cannot be overtaken. False if either happened. A winning letter
 * stamps `won_at`.
 */
export async function addLetter(
  id: string,
  playerId: string,
  letters: string,
  letter: string,
  won: boolean,
): Promise<boolean> {
  const rows = await sql`
    UPDATE hangman_games SET letters = ${letters + letter},
      won_at = CASE WHEN ${won} THEN now() END
    WHERE id = ${id} AND player_id = ${playerId} AND letters = ${letters}
      AND given_up_at IS NULL
    RETURNING id`;
  return rows.length === 1;
}

/** Gives the game up, unless a letter landed since `letters` was read. */
export async function giveUp(
  id: string,
  playerId: string,
  letters: string,
): Promise<boolean> {
  const rows = await sql`
    UPDATE hangman_games SET given_up_at = now()
    WHERE id = ${id} AND player_id = ${playerId} AND letters = ${letters}
      AND given_up_at IS NULL
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
    INSERT INTO hangman_games (player_id, species_slug, puzzle, closes_at)
    VALUES (${playerId}, ${speciesSlug}, ${puzzle}, ${closes})
    ON CONFLICT (player_id, puzzle) DO NOTHING`;
}

/** Every daily game of the player: a few hundred rows after a year. */
export async function findDailyGames(
  playerId: string,
): Promise<(GameRow & { id: string; puzzle: number })[]> {
  const rows = await sql`
    SELECT id, puzzle, species_slug, letters, closes_at, given_up_at
    FROM hangman_games
    WHERE player_id = ${playerId} AND puzzle IS NOT NULL`;
  return rows.map((row) => ({
    id: row.id as string,
    puzzle: row.puzzle as number,
    ...gameRow(row),
  }));
}

export interface WinnerRow {
  place: number;
  nickname: string;
  speciesSlug: string;
  letters: string;
  /** From the game's creation to its winning letter, by the database. */
  ms: number;
  you: boolean;
}

/**
 * The puzzle's winners with a nickname: fewest letters, then shortest time.
 * Every winner of a puzzle found the same letters, so fewest letters is
 * fewest misses. The top 10, and the player's own row wherever it falls.
 * ponytail: no index on `puzzle`, a scan of every game; add one when the
 * table holds enough rows to notice.
 */
export async function findWinners(
  puzzle: number,
  playerId: string,
): Promise<WinnerRow[]> {
  const rows = await sql`
    WITH ranked AS (
      SELECT g.player_id, p.nickname, g.species_slug, g.letters,
        round(extract(epoch FROM g.won_at - g.created_at) * 1000)::int AS ms,
        row_number() OVER (
          ORDER BY length(g.letters), g.won_at - g.created_at, g.id
        )::int AS place
      FROM hangman_games g JOIN players p ON p.id = g.player_id
      WHERE g.puzzle = ${puzzle} AND g.won_at IS NOT NULL
        AND p.nickname IS NOT NULL
    )
    SELECT place, nickname, species_slug, letters, ms,
      player_id = ${playerId} AS you
    FROM ranked WHERE place <= 10 OR player_id = ${playerId}
    ORDER BY place`;
  return rows.map((row) => ({
    place: row.place as number,
    nickname: row.nickname as string,
    speciesSlug: row.species_slug as string,
    letters: row.letters as string,
    ms: row.ms as number,
    you: row.you as boolean,
  }));
}
