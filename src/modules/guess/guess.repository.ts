import { sql } from "@shared/db/client";

export interface GameRow {
  speciesSlug: string;
  guesses: string[];
}

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
    SELECT species_slug, guesses FROM guess_games
    WHERE id = ${id} AND player_id = ${playerId}`;
  return row && { speciesSlug: row.species_slug, guesses: row.guesses };
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
