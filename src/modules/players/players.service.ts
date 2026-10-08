import { randomUUID } from "node:crypto";

import {
  signPlayerId,
  verifyPlayerCookie,
} from "@modules/players/domain/player-cookie";
import { env } from "@shared/config/env";

export const PLAYER_COOKIE = "player";

// Browsers cap a cookie's lifetime at 400 days.
const MAX_AGE = 400 * 24 * 60 * 60;

/*
 * Who is asking, from the cookie the request carried. Without a valid one
 * they become a new player. The route handler sets the cookie after a
 * successful save, which keeps a returning player's 400 days counting from
 * their last one. Its attributes live here, not in the route, because they
 * are identity policy: every route that saves must issue the same cookie.
 */
export function identify(cookie: string | undefined) {
  const id =
    (cookie && verifyPlayerCookie(cookie, env.COOKIE_SECRET)) || randomUUID();
  return {
    id,
    cookie: {
      name: PLAYER_COOKIE,
      value: signPlayerId(id, env.COOKIE_SECRET),
      httpOnly: true,
      // Over plain http (next dev from a phone on the LAN) a Secure cookie is dropped.
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: MAX_AGE,
    },
  };
}
