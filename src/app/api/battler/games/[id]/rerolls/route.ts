import { z } from "zod";

import { changeDraft } from "@app/api/battler/games/[id]/draft";
import { reroll } from "@modules/battler";

/** New offers for this pick, while rerolls last. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/battler/games/[id]/rerolls">,
) {
  return changeDraft(request, ctx.params, z.object({}), (id, playerId) =>
    reroll(id, playerId),
  );
}
