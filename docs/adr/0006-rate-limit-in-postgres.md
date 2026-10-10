# 0006. Hourly rate limit per IP, counted in Postgres

**Status:** accepted, 2026-10-09

## Context

The routes that add rows (`POST /api/players/nickname` and the three
`POST /api/<mode>/games`) issue the player cookie. A script that drops its
cookie becomes a new player on every call: rows in bulk, nicknames claimed in
bulk. Guesses need no limit, because each game caps them (0002). A counter in
memory does not work on serverless functions, which share nothing between
invocations.

## Decision

`throttle` in `src/shared/http` counts each request per bucket and IP in the
`rate_limits` table, one row per key and hour, with a single
`INSERT … ON CONFLICT DO UPDATE … RETURNING` that also purges past hours. Over
the cap it answers 429, before saving anything or issuing the cookie. Caps:
10 nickname requests and 60 games per IP per hour, shared across modes.

- The key is the first address of `x-forwarded-for`. Next fills the header
  with the socket's address when it is missing, and Vercel overwrites it with
  the client's, so it cannot be spoofed there. IPv6 addresses are keyed by
  their /64, the block one subscriber gets.
- Nickname requests are counted after validation; a taken name counts, which
  slows probing for the ones in use.
- The daily route throttles only new players: a known one has at most one game
  per puzzle, so going back to it adds no rows.

## Consequences

- No new dependency and no external service; the table holds one hour at most.
- One extra query per request on those four routes.
- Players behind the same NAT share a cap, which is why the caps are generous.
- Locally every request comes from `::1`, so `next dev`, the e2e smoke and
  manual play share one cap.
- Vercel's firewall rate limiting is the upgrade if the database ever becomes
  the bottleneck.
