import { sql } from "@shared/db/client";

export interface GameRow {
  speciesSlug: string;
  guesses: string[];
  /** Daily games only: when the puzzle stops being today anywhere. */
  closesAt: Date | null;
}

const closesAt = (value: unknown) => (value ? new Date(value as string) : null);

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
    SELECT species_slug, guesses, closes_at FROM guess_games
    WHERE id = ${id} AND player_id = ${playerId}`;
  return (
    row && {
      speciesSlug: row.species_slug,
      guesses: row.guesses,
      closesAt: closesAt(row.closes_at),
    }
  );
}

/**
 * Appends a guess only if no other one landed since `count` guesses were
 * read, so two at once cannot both pass the cap. False if one did.
 */
export async function addGuess(
  id: string,
  playerId: string,
  count: number,
  slug: string,
): Promise<boolean> {
  const rows = await sql`
    UPDATE guess_games SET guesses = array_append(guesses, ${slug})
    WHERE id = ${id} AND player_id = ${playerId}
      AND cardinality(guesses) = ${count}
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
    SELECT id, puzzle, species_slug, guesses, closes_at FROM guess_games
    WHERE player_id = ${playerId} AND puzzle IS NOT NULL`;
  return rows.map((row) => ({
    id: row.id,
    puzzle: row.puzzle,
    speciesSlug: row.species_slug,
    guesses: row.guesses,
    closesAt: closesAt(row.closes_at),
  }));
}
