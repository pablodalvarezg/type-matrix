import { cookies } from "next/headers";

import { startGame } from "@modules/guess";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";

/**
 * Starts a game for the caller; their first one also makes them a player.
 * TODO(pablo): no throttle yet, the same open question as Hangman's (step 9).
 */
export async function POST(request: Request) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;

  const store = await cookies();
  const { id, cookie } = identify(store.get(PLAYER_COOKIE)?.value);
  const game = await startGame(id);
  store.set(cookie);
  return Response.json(game, { status: 201 });
}
