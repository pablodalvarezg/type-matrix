import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * The cookie is `<id>.<signature>`. A random id is already unguessable; the
 * signature is what stops a client from picking an id of its own.
 */

const signature = (id: string, secret: string) =>
  createHmac("sha256", secret).update(id).digest("base64url");

export function signPlayerId(id: string, secret: string): string {
  return `${id}.${signature(id, secret)}`;
}

/** The player id, or null when the cookie was not signed with this secret. */
export function verifyPlayerCookie(
  cookie: string,
  secret: string,
): string | null {
  const [id, given, ...rest] = cookie.split(".");
  if (!id || !given || rest.length > 0) return null;
  const expected = Buffer.from(signature(id, secret));
  const actual = Buffer.from(given);
  return actual.length === expected.length && timingSafeEqual(actual, expected)
    ? id
    : null;
}
