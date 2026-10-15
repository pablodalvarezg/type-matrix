# 0009. Hangman campaign, and a scored free-play streak

**Status:** accepted, 2026-10-14

## Context

Pablo asked for a Hangman campaign that unlocks the generations one by one,
next to free play, and for a free-play streak that scores more the fewer the
misses and the faster the win (decided on 2026-10-13 and 2026-10-14):

- Campaign: Gen I first; ten wins finish a generation; each loss takes one
  win back, never below zero, and a finished generation stays finished.
- Free play: every species by default. While the campaign runs, the player
  may limit it to one finished generation; once it is done, to any set.
- A free-play win scores `100 + 20 × misses left + 1 per second under 180`.
  A loss ends the streak. Only the player sees their streaks.

## Decision

- **Two modes on one table.** `hangman_games.campaign` (migration 0010) tells
  them apart, and each has its own open game. Daily games stay what they
  were, the rows with a puzzle.
- **Progress and streaks are derived, never stored**, like the daily streaks:
  `findHistory` reads a mode's games in order, the service turns each
  finished one into a result, and `domain/campaign.ts` and `domain/score.ts`
  fold them. The open game is that history's last row, if it still plays.
  A fix to a rule rewrites history consistently, and there is no counter to
  fall out of step with the rows.
- **Time is the database's**, `created_at` to `won_at`, as on the
  leaderboard, in whole seconds: these games never close, and a win 25 days
  on overflows an int of milliseconds. `won_at` was already stamped on every
  winning letter.
- **Generations come from national dex ranges** (`dex/domain/generations.ts`),
  not from a re-ingest: the snapshot holds default forms, so a species' id is
  its dex number. A test pins one species per generation boundary.
- **The server checks every selection** (`canPick`): a free-play game limited
  to a generation the campaign has not finished is a 403. Free play stores
  its `gens` so "Play again" asks for the same ones, and the server checks
  them again.
- `NewGameButton` sends what is checked in the `[data-game-options]`
  element it sits in, so the generation picker is native radios and
  checkboxes drawn on the server: no new client component. Not a `<form>`:
  with no submit handler, one could be sent as a GET.

## Consequences

- Every read of the page folds the player's whole history in that mode. A
  few thousand rows for a heavy player; marked `ponytail:` in the repository,
  with running totals as the upgrade.
- Time keeps running while a game is left open, "Continue" included. On
  purpose: a game cannot be paused to look the answer up.
- A campaign game may repeat a species already won in that generation.
- Two starts at the same instant can still make two games (ADR 0008). The
  older one, never offered again, counts as lost, so abandoning it is not a
  free reroll. It stays playable by its id, and a win there still counts.
