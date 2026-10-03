import { z } from "zod";

/*
 * The schema and its parser, with no environment read of their own. Pure, so
 * tests can exercise it without the ambient shell deciding whether the suite
 * loads, and so `env.ts` stays the one place that touches `process.env`.
 */

const envSchema = z.object({
  DATABASE_URL: z.url(),

  /*
   * Seeds the daily puzzle. Never rotated: changing it rewrites every past
   * puzzle. The length floor is what keeps tomorrow's answer out of reach of
   * anyone reading the public repo.
   */
  DAILY_SECRET: z.string().min(32),

  COOKIE_SECRET: z.string().min(32),

  // Date of puzzle #1. TODO(pablo): the day of the first deploy with the daily puzzle.
  LAUNCH_DATE: z.iso.date(),
});

export type Env = z.infer<typeof envSchema>;

/** Validates a raw environment. Pure: the caller supplies the source. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}
