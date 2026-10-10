# 0003. Plain SQL on Neon, no ORM

**Status:** accepted, step 5

## Context

The games need a database from step 5 on: players, games and their guesses.
Everything has to fit free plans, and the app deploys as serverless functions
on Vercel.

## Decision

Neon Postgres through `@neondatabase/serverless`, one HTTP query per call, with
plain tagged-template SQL inside the repositories. Migrations are numbered
`.sql` files in `db/migrations/`, applied in order and once by
`scripts/migrate.ts`, which records them in `schema_migrations`.

## Consequences

- Five tables do not justify an ORM, its generated client, or its build step.
- Invariants live in the database: unique nickname by `lower(nickname)`, one
  daily game per player and puzzle, times from Neon's clock.
- No connection pool to manage between invocations; a statement that needs
  several steps is written as one query, like the rate limit's CTE (0006).
- Repositories are the only files with SQL, so tests swap them for in-memory
  maps behind the same interface.
