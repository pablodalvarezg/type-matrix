# 0005. The daily puzzle is a Stats & types game, computed and not stored

**Status:** accepted, 2026-10-09. Amended by 0007: a Hangman round joins it.

## Context

Everyone gets the same puzzle each day, the repo is public, and there is no
scheduler on the free plan. "Today" depends on the player's timezone, and
streaks must not be repairable after the fact.

## Decision

- The answer is a function of the puzzle number: `POOL_V1` shuffled once with a
  seed from `HMAC(DAILY_SECRET, "v1")`, indexed by the number. No cron, no
  table of future answers, and the source code alone cannot reveal tomorrow's.
- A daily game is a row of `guess_games` with a `puzzle` column, unique per
  player: same engine, same board, same guesses endpoint as free play.
- The client sends its local date; the server accepts it only if it is today
  somewhere between UTC−12 and UTC+14.
- A puzzle closes at 12:00 UTC the day after its date, when it is no longer
  today anywhere (`closes_at`). An unfinished game is lost from then on.
- Streaks and the leaderboard are derived from the games, never stored. The
  leaderboard's time runs from `created_at` to `won_at`, both from Neon's clock.

## Consequences

- `POOL_V1` and `DAILY_SECRET` are frozen: changing either rewrites every past
  puzzle. A new pool becomes `POOL_V2` from a given puzzle number.
- No code to maintain twice between free play and the daily puzzle, and the
  no-leak test covers both.
- A skipped puzzle can show as a broken streak up to a day late, because the
  page never sees the player's date.
