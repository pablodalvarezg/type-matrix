import { z } from "zod";

import { DIFFICULTIES, TEAM_SIZE } from "@modules/battler/domain/draft";

export const startBody = z.object({ difficulty: z.enum(DIFFICULTIES) });

const slug = z.string().min(1).max(64);

/** One of the offers, by slug. Which ones are offered is the service's call. */
export const pickBody = z.object({ species: slug });

/** The team in the order it fights; that it is the team is the service's call. */
export const orderBody = z.object({ order: z.array(slug).length(TEAM_SIZE) });

// A malformed uuid is an SQL error, not a miss: checked before the query.
export const runId = z.uuid();
