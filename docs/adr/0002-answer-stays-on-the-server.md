# 0002. The answer stays on the server until the game ends

**Status:** accepted, 2026-10-07

## Context

Most guessing games send the answer to the browser and hide it. Proving the
opposite is one of the two reasons this project exists. In Next.js, any prop a
Server Component passes to a Client Component is serialised into the RSC
payload, so "it is a server component" protects nothing on its own.

## Decision

A game is a database row; the client holds its id. Each guess is a `POST` that
returns the public view of the game: the feedback so far, never the answer,
until the response that ends it. The board components are client components
that receive only that view. Guesses per game are capped on the server, which
doubles as the rate limit on guessing.

## Consequences

- `tests/no-leak.test.ts` plays whole games of every mode through the route
  handlers and the page views, and fails if any response before the last one
  carries the answer by id, name, slug or stat line.
- Without JavaScript the games cannot be played; that was accepted.
- A server round trip per guess, which Neon's HTTP driver keeps to one query
  per request.
