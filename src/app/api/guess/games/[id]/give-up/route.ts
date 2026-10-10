import { cookies } from "next/headers";

import { giveUp, type GiveUpError } from "@modules/guess";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";

const errors: Record<GiveUpError, [string, number]> = {
  "not-found": ["No such game", 404],
  over: ["The game is over", 409],
  conflict: ["Another guess landed first", 409],
};

/** Ends the game as lost. The response is the first to carry the answer. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/guess/games/[id]/give-up">,
) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;

  const store = await cookies();
  const { id: playerId, cookie } = identify(store.get(PLAYER_COOKIE)?.value);
  const { id } = await ctx.params;

  const result = await giveUp(id, playerId);
  if (typeof result === "string") {
    const [error, status] = errors[result];
    return Response.json({ error }, { status });
  }
  store.set(cookie);
  return Response.json(result);
}
