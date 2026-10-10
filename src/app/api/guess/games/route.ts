import { cookies } from "next/headers";

import { startGame } from "@modules/guess";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";
import { throttle } from "@shared/http/throttle";

/**
 * The caller's open game, or a new one; their first also makes them a player.
 * Throttled per IP, like Hangman's.
 */
export async function POST(request: Request) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;
  const throttled = await throttle(request, "games");
  if (throttled) return throttled;

  const store = await cookies();
  const { id, cookie } = identify(store.get(PLAYER_COOKIE)?.value);
  const game = await startGame(id);
  store.set(cookie);
  return Response.json(game, { status: 201 });
}
