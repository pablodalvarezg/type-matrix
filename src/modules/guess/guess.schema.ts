import { z } from "zod";

// A name or slug, as typed. Whether it is a species is the service's call.
export const guessBody = z.object({
  species: z.string().trim().min(1, "Name a species").max(40),
});

// A malformed uuid is an SQL error, not a miss: checked before the query.
export const gameId = z.uuid();
