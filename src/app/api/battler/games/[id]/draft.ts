import { cookies } from "next/headers";
import { z } from "zod";

import type { DraftError } from "@modules/battler";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";

const errors: Record<DraftError, [string, number]> = {
  "not-found": ["No such tournament", 404],
  over: ["That part of the draft is over", 409],
  "not-offered": ["That species is not on offer", 409],
  "no-rerolls": ["No rerolls left", 409],
  "not-your-team": ["That is not your team", 400],
  conflict: ["Another change landed first", 409],
};

/**
 * What a pick, a reroll and the team's order share: JSON only, the body
 * parsed, the caller's own run changed, and the run back.
 */
export async function changeDraft<T>(
  request: Request,
  params: Promise<{ id: string }>,
  schema: z.ZodType<T>,
  change: (
    id: string,
    playerId: string,
    body: T,
  ) => Promise<object | DraftError>,
) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: z.prettifyError(body.error) },
      { status: 400 },
    );
  }

  const store = await cookies();
  const { id: playerId, cookie } = identify(store.get(PLAYER_COOKIE)?.value);
  const { id } = await params;

  const result = await change(id, playerId, body.data);
  if (typeof result === "string") {
    const [error, status] = errors[result];
    return Response.json({ error }, { status });
  }
  store.set(cookie);
  return Response.json(result);
}
