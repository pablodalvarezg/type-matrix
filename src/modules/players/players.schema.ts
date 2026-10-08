import { z } from "zod";

/*
 * What a leaderboard shows, so it stays short and plain: no spaces, accents
 * or symbols that could pass for another player's name. Uniqueness, case
 * aside, is the database's job.
 */
export const nicknameSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_-]{3,16}$/,
    "3 to 16 characters: letters, digits, _ or -",
  );

export const nicknameBody = z.object({ nickname: nicknameSchema });
