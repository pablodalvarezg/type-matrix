import { changeDraft } from "@app/api/battler/games/[id]/draft";
import { order, orderBody } from "@modules/battler";

/** The team's fighting order. The response carries the played bracket. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/battler/games/[id]/order">,
) {
  return changeDraft(request, ctx.params, orderBody, (id, playerId, body) =>
    order(id, playerId, body.order),
  );
}
