# 0008. One open game per mode, and giving up

**Status:** accepted, 2026-10-09

## Context

Leaving a free-play board (the breadcrumb, say) lost the game: the mode's
page only offered a new one, and the old game stayed open with no way back.
Pablo asked to keep it open unless the player gives up, and for giving up to
show the answer.

## Decision

- One free-play game per player and mode. `POST /api/<mode>/games` hands back
  the open one if there is; the mode's page offers "Continue" instead of
  "New game". Only the latest free-play game can be open, since a new one is
  made only once the last is over, so finding it is one ordered query.
- `POST /api/<mode>/games/{id}/give-up` stamps `given_up_at` (migration
  0008): the game is lost, and that response is the first to carry the
  answer. It works on daily games too, where it counts as a loss.
- A give-up and a guess never both land: each updates only if the game is as
  it was read (same letters or guess count) and not given up, the optimistic
  concurrency the guesses already had.

## Consequences

- Two starts at the same instant can both make a game; the older one stays
  open but is never offered again. Accepted: it costs a row, not a game.
- Domain `progress` takes a `stop` ("closed" or "gave-up") instead of a
  boolean, and says which one ended the game, so the board can say why.
- The no-leak test gives up in every kind of game and checks nothing before
  the give-up carries the answer.
