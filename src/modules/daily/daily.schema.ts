import { z } from "zod";

/**
 * The player's local date, and which round. The server decides whether the
 * date is today anywhere.
 */
export const dailyBody = z.object({
  date: z.iso.date(),
  mode: z.enum(["guess", "hangman"]),
});

// The ceiling keeps a typed URL inside a Postgres integer: 2700 years of puzzles.
export const puzzleParam = z.coerce.number().int().min(1).max(1_000_000);
