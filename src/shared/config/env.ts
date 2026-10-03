import "server-only";

import { parseEnv } from "@shared/config/env-schema";

export type { Env } from "@shared/config/env-schema";

/*
 * The single place that reads `process.env`.
 *
 * `server-only` keeps it there, and here it guards more than bundle size: this
 * object holds the daily secret, and a client component that reached it would
 * fail the build instead of shipping the seed to the browser.
 *
 * Next resolves `server-only` internally, so it needs no entry in package.json.
 */
export const env = parseEnv(process.env);
