import { z } from "zod";

export const guessBody = z.object({
  letter: z
    .string()
    .regex(/^[A-Za-z]$/, "One letter, A to Z")
    .transform((letter) => letter.toLowerCase()),
});

/**
 * A new campaign or free-play game. `gen` is what the free-play form sends,
 * as strings: none, or an empty one, is every species. Which generations the
 * player may pick is the service's call.
 */
export const startBody = z.object({
  campaign: z.boolean().default(false),
  gen: z
    .array(z.string().regex(/^\d*$/, "A generation number"))
    .default([])
    .transform((values) => values.filter(Boolean).map(Number)),
});

// A malformed uuid is an SQL error, not a miss: checked before the query.
export const gameId = z.uuid();
