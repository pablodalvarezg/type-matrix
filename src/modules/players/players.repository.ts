import { NeonDbError } from "@neondatabase/serverless";

import { sql } from "@shared/db/client";

const UNIQUE_VIOLATION = "23505";
const NICKNAME_INDEX = "players_nickname_key"; // db/migrations/0001_players.sql

/**
 * Creates the player on their first save. False when another player already
 * has the nickname, case aside.
 */
export async function setNickname(
  id: string,
  nickname: string,
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO players (id, nickname) VALUES (${id}, ${nickname})
      ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname`;
    return true;
  } catch (error) {
    if (
      error instanceof NeonDbError &&
      error.code === UNIQUE_VIOLATION &&
      error.constraint === NICKNAME_INDEX
    ) {
      return false;
    }
    throw error;
  }
}
