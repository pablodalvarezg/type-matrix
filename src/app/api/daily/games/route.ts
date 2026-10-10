import { cookies } from "next/headers";
import { z } from "zod";

import { dailyBody, startDaily } from "@modules/daily";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";
import { throttle } from "@shared/http/throttle";

/**
 * Starts the caller's game for today's puzzle, or returns the one they have.
 * Guesses go to the Stats & types endpoint, like any other game of theirs.
 * Only a new player is throttled: a known one has at most one game per
 * puzzle, so returning to it, the button's usual job, adds no rows.
 */
export async function POST(request: Request) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;

  const body = dailyBody.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: z.prettifyError(body.error) },
      { status: 400 },
    );
  }

  const store = await cookies();
  const sent = store.get(PLAYER_COOKIE)?.value;
  const { id, cookie } = identify(sent);
  // The signature is deterministic: the same value back means a valid cookie.
  if (cookie.value !== sent) {
    const throttled = await throttle(request, "games");
    if (throttled) return throttled;
  }
  const game = await startDaily(id, body.data.date);
  if (game === "not-today") {
    return Response.json(
      { error: "That date is not today anywhere" },
      { status: 400 },
    );
  }
  store.set(cookie);
  return Response.json(game, { status: 201 });
}
