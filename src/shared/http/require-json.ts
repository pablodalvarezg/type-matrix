/**
 * A 415 unless the request is JSON, for every route that sets the player
 * cookie. A form on another site can post text/plain that parses as JSON, and
 * the response would replace the victim's cookie. JSON needs a CORS preflight.
 */
export function rejectUnlessJson(request: Request): Response | undefined {
  const type = request.headers.get("content-type")?.toLowerCase();
  if (type?.startsWith("application/json")) return undefined;
  return Response.json({ error: "Expected application/json" }, { status: 415 });
}
