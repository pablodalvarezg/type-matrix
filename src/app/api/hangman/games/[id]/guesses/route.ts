import { cookies } from "next/headers";
import { z } from "zod";

import { guess, guessBody, type GuessError } from "@modules/hangman";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { rejectUnlessJson } from "@shared/http/require-json";

const errors: Record<GuessError, [string, number]> = {
  "not-found": ["No such game", 404],
  over: ["The game is over", 409],
  repeated: ["Letter already guessed", 409],
  conflict: ["Another guess landed first", 409],
};

/** One letter. The response is that guess's feedback, and nothing more. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/hangman/games/[id]/guesses">,
) {
  const notJson = rejectUnlessJson(request);
  if (notJson) return notJson;

  const body = guessBody.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: z.prettifyError(body.error) },
      { status: 400 },
    );
  }

  const store = await cookies();
  const { id: playerId, cookie } = identify(store.get(PLAYER_COOKIE)?.value);
  const { id } = await ctx.params;

  const result = await guess(id, playerId, body.data.letter);
  if (typeof result === "string") {
    const [error, status] = errors[result];
    return Response.json({ error }, { status });
  }
  store.set(cookie);
  return Response.json(result);
}
