# 0007. The daily puzzle gets a Hangman round

**Status:** accepted, 2026-10-09. Amends 0005, which made the daily puzzle a
Stats & types game only.

## Context

Pablo asked for a daily Hangman next to the daily Stats & types. The two
rounds share the puzzle number, the timezone window and the closing time, so
the question was how much of 0005 carries over and what the rounds share.

## Decision

- A daily Hangman game is a row of `hangman_games` with `puzzle`, `closes_at`
  and `won_at` (migration 0009), unique per player and puzzle: the same shape
  0005 gave `guess_games`. Same engine, board and endpoints as free play.
- The daily service runs one "round" per mode: how a mode picks its species,
  makes its game, lists the player's games and builds its leaderboard. The
  number, window, closing time and streak rules are shared.
- Each round has its own shuffle of `POOL_V1` (seed versions `"v1"` and
  `"hangman-v1"`). The rounds never share a species: Hangman's order is kept
  apart from Stats & types', swapping each clash with the next position, so it
  is still a permutation of the pool and repeats nothing within a cycle.
- Streaks and leaderboards are per round. Hangman ranks by fewest misses: every
  winner of a puzzle found the same letters, so fewest letters tried is fewest
  misses, and no column is needed for it.

## Consequences

- `LAUNCH_DATE` is shared: Hangman's first daily puzzle has the number of the
  day it ships, not #1.
- Changing either seed version or `POOL_V1` rewrites that round's past
  puzzles, as 0005 says for Stats & types.
- The no-leak test plays the Hangman round too.
