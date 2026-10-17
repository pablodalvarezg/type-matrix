import type { Difficulty } from "@modules/battler/domain/draft";
import { sql } from "@shared/db/client";

export interface RunRow {
  id: string;
  difficulty: Difficulty;
  seed: string;
  picks: string[];
  rerolls: number;
  ordered: boolean;
}

type Row = Record<string, unknown>;
const runRow = (row: Row): RunRow => ({
  id: row.id as string,
  difficulty: row.difficulty as Difficulty,
  seed: row.seed as string,
  picks: row.picks as string[],
  rerolls: row.rerolls as number,
  ordered: row.ordered as boolean,
});

/** Creates the run, and the player too if this is their first save. */
export async function createRun(
  playerId: string,
  difficulty: Difficulty,
): Promise<RunRow> {
  const [row] = await sql`
    WITH player AS (
      INSERT INTO players (id) VALUES (${playerId}) ON CONFLICT (id) DO NOTHING
    )
    INSERT INTO battler_runs (player_id, difficulty)
    VALUES (${playerId}, ${difficulty})
    RETURNING id, difficulty, seed, picks, rerolls, ordered`;
  return runRow(row!);
}

/** Only the player who started a run can find it. */
export async function findRun(
  id: string,
  playerId: string,
): Promise<RunRow | undefined> {
  const [row] = await sql`
    SELECT id, difficulty, seed, picks, rerolls, ordered
    FROM battler_runs WHERE id = ${id} AND player_id = ${playerId}`;
  return row && runRow(row);
}

/**
 * Every run of the player, oldest first: the open ones and whether the
 * Nuzlocke is unlocked come from it.
 */
export async function findRuns(playerId: string): Promise<RunRow[]> {
  const rows = await sql`
    SELECT id, difficulty, seed, picks, rerolls, ordered
    FROM battler_runs WHERE player_id = ${playerId}
    ORDER BY created_at, id`;
  return rows.map(runRow);
}

/**
 * Writes the draft only if it is still as it was read (no pick or reroll
 * landed since, and the team is not ordered), so two requests at once
 * cannot both spend the same offers. False if one did.
 */
export async function saveDraft(
  run: RunRow,
  playerId: string,
  next: Pick<RunRow, "picks" | "rerolls" | "ordered">,
): Promise<boolean> {
  const rows = await sql`
    UPDATE battler_runs
    SET picks = ${next.picks}, rerolls = ${next.rerolls},
      ordered = ${next.ordered}
    WHERE id = ${run.id} AND player_id = ${playerId}
      AND picks = ${run.picks} AND rerolls = ${run.rerolls} AND NOT ordered
    RETURNING id`;
  return rows.length === 1;
}
