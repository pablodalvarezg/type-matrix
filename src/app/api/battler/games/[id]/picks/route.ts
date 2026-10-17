import { changeDraft } from "@app/api/battler/games/[id]/draft";
import { pick, pickBody } from "@modules/battler";

/** One of this pick's offers, by slug. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/battler/games/[id]/picks">,
) {
  return changeDraft(request, ctx.params, pickBody, (id, playerId, body) =>
    pick(id, playerId, body.species),
  );
}
