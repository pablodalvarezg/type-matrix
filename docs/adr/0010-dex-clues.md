# 0010. Dex Clues replaces Stats & types

**Status:** accepted, 2026-10-15

## Context

Pablo asked to rework Stats & types (decided on 2026-10-14 and 2026-10-15).
Guessing by six base stats was more arithmetic than recognition. The new
mode, Dex Clues, compares what a person remembers about a species:

- Ten guesses. Per guess: each type ✓ or ✗ (and = when exact), Pokédex
  color ✓ or ✗, and generation, evolution stage, height and weight with an
  arrow. Height in metres with two decimals, weight in kilograms with one.
- Hints unlocked by misses: the generation after 3, the full typing after
  6, the first letter and the letters of each part of the name after 9,
  for the last guess: "2 + 4 letters, with a space" for Mr. Mime. Letters
  only, but a space or hyphen is shown, since a total alone misleads.
- A free-play streak scored like Hangman's:
  `100 + 20 × guesses left + 1 per second under 180`. The daily round
  stays, with its streak and leaderboard.
- One card per guess on mobile.

## Decision

- **Only the visible name changes.** The module, the table (`guess_games`),
  the routes (`/guess`, `/daily/guess/{n}`, `/api/guess/...`) and the daily
  `mode: "guess"` keep `guess`, which still describes the game. No
  migration: the table already had `created_at` and `won_at`.
- **The snapshot gains four fields** read from responses the ingest already
  fetched, so no new calls: `color` and `evolvesFrom` from
  `pokemon-species`, `height` and `weight` from `pokemon`, in PokéAPI's
  decimetres and hectograms, exact integers. The re-ingest of 2026-10-15
  changed nothing else.
- **The evolution stage is derived** (`dex/domain/evolution.ts`), not
  ingested: 1 with no pre-evolution, one more than the pre-evolution
  otherwise. The Battler's "does not evolve further" comes from the same
  field, so the evolution chains are not downloaded.
- **Hints are part of the view**, computed on the server from the misses.
  They give away part of the answer on purpose; the name and id still wait
  for the end. The no-leak test's fingerprint moved from the stat line to
  the answer's height and weight together, and the guesses it plays never
  share them.
- **Hangman says the shape too**, under its mask, counted the same way.
  The count lives in each domain (a domain imports nothing outside itself);
  the sentence, in `shared/name-shape.ts`.
- **Points and streaks moved to `shared/score.ts`**, with `StreakSummary`
  in `shared/ui`: both modes fold their history the same way, and a
  module's domain cannot import another's. `points` takes what is left
  (misses in Hangman, guesses here).
- **One markup for both layouts.** Below `md` each guess is a card with its
  labels; from `md` the cards are rows of one grid through `subgrid`, the
  labels screen-reader only and a header row drawn once. The game pages are
  `max-w-3xl`: seven columns do not fit in `max-w-2xl`.

## Consequences

- Stats & types games in a database from before this change replay under
  the new rules: ten guesses, so a game lost at eight is open again. There
  was no production database yet.
- Every free-play read folds the player's whole history, as in Hangman.
- The status line says only the species and "New hint"; the full comparison
  is read to screen readers, since the card shows it.
