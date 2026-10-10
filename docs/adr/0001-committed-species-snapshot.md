# 0001. Committed species snapshot, no runtime calls to PokéAPI

**Status:** accepted, 2026-10-03

## Context

Every mode reads species, moves and the type chart. PokéAPI asks consumers to
cache, a runtime dependency on a third-party API is a failure mode the games do
not need, and the data changes only when a new game comes out.

## Decision

`scripts/ingest.ts` downloads the data once and writes `data/snapshot.json`,
which is committed with one entry per line. The app imports it statically, so
the bundler ships it with the server output, and parses it with Zod once per
process. Only `dex/data` may import it, behind `server-only`: the snapshot holds
every answer. The species are the 1025 default forms; each one keeps the
learnset of the most recent game it appears in.

## Consequences

- No network call at runtime, and nothing for Vercel's output tracing to miss.
- A re-ingest is a manual decision whose diff shows which species changed.
- Importing the JSON from anywhere else would bypass `server-only`, so a
  boundaries rule forbids it and `data/**` is in `boundaries/include`.
- Moves with variable power or mechanics of their own are left out or flagged;
  that list is maintained by hand.
