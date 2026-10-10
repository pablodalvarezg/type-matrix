import { cookies } from "next/headers";
import { z } from "zod";

import {
  identify,
  nicknameBody,
  PLAYER_COOKIE,
  setNickname,
} from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";
import { throttle } from "@shared/http/throttle";

/**
 * Sets the caller's nickname; their first call also makes them a player.
 * Throttled per IP, or a script that drops its cookie could claim names in bulk.
 * A taken name counts too, on purpose: it slows probing for which ones exist.
 */
export async function POST(request: Request) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;

  const body = nicknameBody.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: z.prettifyError(body.error) },
      { status: 400 },
    );
  }
  const throttled = await throttle(request, "nickname");
  if (throttled) return throttled;

  const store = await cookies();
  const { id, cookie } = identify(store.get(PLAYER_COOKIE)?.value);

  const { nickname } = body.data;
  if (!(await setNickname(id, nickname))) {
    return Response.json(
      { error: `${nickname} is already taken` },
      { status: 409 },
    );
  }
  // Only after the save: a cookie for an id with no row could replace the
  // one that owns the nickname (a double submit, say).
  store.set(cookie);
  return Response.json({ nickname });
}
