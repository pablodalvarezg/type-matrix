import "server-only";

import { neon } from "@neondatabase/serverless";

import { env } from "@shared/config/env";

/*
 * One query per HTTP request, which is what a route handler on a serverless
 * function wants: no connection to keep open between invocations.
 */
export const sql = neon(env.DATABASE_URL);
