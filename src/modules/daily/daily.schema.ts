import { z } from "zod";

/** The player's local date. The server decides whether it is today anywhere. */
export const dailyBody = z.object({ date: z.iso.date() });

// The ceiling keeps a typed URL inside a Postgres integer: 2700 years of puzzles.
export const puzzleParam = z.coerce.number().int().min(1).max(1_000_000);
