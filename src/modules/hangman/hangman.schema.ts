import { z } from "zod";

export const guessBody = z.object({
  letter: z
    .string()
    .regex(/^[A-Za-z]$/, "One letter, A to Z")
    .transform((letter) => letter.toLowerCase()),
});

// A malformed uuid is an SQL error, not a miss: checked before the query.
export const gameId = z.uuid();
