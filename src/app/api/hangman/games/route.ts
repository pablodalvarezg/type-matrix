import { cookies } from "next/headers";
import { z } from "zod";

import { startBody, startGame, type StartError } from "@modules/hangman";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";
import { throttle } from "@shared/http/throttle";

const errors: Record<StartError, [string, number]> = {
  locked: ["Those generations are not unlocked yet", 403],
  "campaign-done": ["The campaign is complete", 409],
};

/**
 * The caller's open game of that mode, campaign or free play, or a new one;
 * their first also makes them a player.
 * Throttled per IP: a script that drops its cookie adds two rows per call.
 */
export async function POST(request: Request) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;
  const throttled = await throttle(request, "games");
  if (throttled) return throttled;

  const body = startBody.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return Response.json(
      { error: z.prettifyError(body.error) },
      { status: 400 },
    );
  }

  const store = await cookies();
  const { id, cookie } = identify(store.get(PLAYER_COOKIE)?.value);
  const game = await startGame(id, body.data);
  if (typeof game === "string") {
    const [error, status] = errors[game];
    return Response.json({ error }, { status });
  }
  store.set(cookie);
  return Response.json(game, { status: 201 });
}
