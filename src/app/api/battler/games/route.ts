import { cookies } from "next/headers";
import { z } from "zod";

import { startBody, startRun, type StartError } from "@modules/battler";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";
import { throttle } from "@shared/http/throttle";

const errors: Record<StartError, [string, number]> = {
  locked: ["Win a tournament on hard first", 403],
};

/**
 * The caller's open tournament of that difficulty, or a new one; their
 * first also makes them a player.
 * Throttled per IP: a script that drops its cookie adds two rows per call.
 */
export async function POST(request: Request) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;
  const throttled = await throttle(request, "games");
  if (throttled) return throttled;

  const body = startBody.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: z.prettifyError(body.error) },
      { status: 400 },
    );
  }

  const store = await cookies();
  const { id, cookie } = identify(store.get(PLAYER_COOKIE)?.value);
  const run = await startRun(id, body.data.difficulty);
  if (typeof run === "string") {
    const [error, status] = errors[run];
    return Response.json({ error }, { status });
  }
  store.set(cookie);
  return Response.json(run, { status: 201 });
}
