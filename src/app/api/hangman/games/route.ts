import { cookies } from "next/headers";

import { startGame } from "@modules/hangman";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";

/**
 * Starts a game for the caller; their first one also makes them a player.
 * TODO(pablo): no throttle yet, so a script that drops its cookie adds two
 * rows per call. The same open question as the nickname route (step 9).
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
