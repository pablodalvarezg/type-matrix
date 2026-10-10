# 0004. Identity is a signed cookie, issued on the first save

**Status:** accepted, 2026-10-07

## Context

Games, streaks and the leaderboard need to know who is playing. Login, OAuth
and paid services are out of scope.

## Decision

The player is a random UUID in an `httpOnly`, `sameSite=lax` cookie,
`<uuid>.<hmac-sha256>` signed with `COOKIE_SECRET`, valid for 400 days and
renewed on each successful save. It is issued by the first action that saves
something (a nickname, a game), never on a visit, and the player's row is
created in that same save. Routes that issue it require
`Content-Type: application/json`, so a form on another site cannot replace a
player's cookie. A game belongs to the player who started it; with any other
cookie it is a 404.

## Consequences

- Bots and visitors who only look leave no rows behind.
- Clearing the cookie means starting over with no streak. A magic-link login is
  the upgrade if that becomes a real problem.
- `identify` describes the cookie as data and each route sets it: the one place
  a service knows about HTTP, so every route issues the same attributes.
- A script that drops its cookie is a new player on every call; see 0006.
