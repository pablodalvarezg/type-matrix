import { sql } from "@shared/db/client";

export interface GameRow {
  speciesSlug: string;
  letters: string;
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
    SELECT species_slug, letters FROM hangman_games
    WHERE id = ${id} AND player_id = ${playerId}`;
  return row && { speciesSlug: row.species_slug, letters: row.letters };
}

/**
 * Appends a letter only if nobody else did since `letters` was read, so two
 * guesses at once cannot both pass the wrong-letter cap. False if one did.
 */
export async function addLetter(
  id: string,
  playerId: string,
  letters: string,
  letter: string,
): Promise<boolean> {
  const rows = await sql`
    UPDATE hangman_games SET letters = ${letters + letter}
    WHERE id = ${id} AND player_id = ${playerId} AND letters = ${letters}
    RETURNING id`;
  return rows.length === 1;
}
