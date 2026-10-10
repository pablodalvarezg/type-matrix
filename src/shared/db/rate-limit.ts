import "server-only";

import { sql } from "@shared/db/client";

/**
 * Counts one hit for `key` in the current hour and returns the hour's total.
 * The same statement drops past hours, so the table holds one hour at most.
 */
export async function hit(key: string): Promise<number> {
  const rows = await sql`
    WITH purge AS (
      DELETE FROM rate_limits WHERE window_start < date_trunc('hour', now())
    )
    INSERT INTO rate_limits (key, window_start)
    VALUES (${key}, date_trunc('hour', now()))
    ON CONFLICT (key, window_start)
      DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits`;
  return Number(rows[0]?.hits);
}
