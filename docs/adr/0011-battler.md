# 0011. Battler: a server-drawn draft and an own simulation

**Status:** accepted, 2026-10-16

## Context

Pablo asked for a Battler (decided on 2026-10-14 and 2026-10-16): draft six
species from offers, then play an auto-generated eight-team tournament.
Easy has 6 offers per pick and 6 rerolls, hard 3 and 3, and a secret
Nuzlocke, unlocked by a title on hard, 3 and none, from species that evolve
no further with 450 base stats or more. In the Nuzlocke, whoever faints is
gone for the rest of the bracket. Rivals draft on hard and Nuzlocke; on
easy they are random. The team can be reordered before the bracket, except
in the Nuzlocke.

## Decision

- **An own simulation, not Showdown's engine.** 6 vs 6 singles at level
  50, IVs 31, no EVs, neutral natures, with `damage()` and the six stats:
  each side uses the move with the most expected damage (mean roll times
  accuracy), the faster moves first, and accuracy, critical hits and the
  roll are drawn. When the two active fighters cannot hurt each other,
  one side at a time sends its active one to the back of the line, like an
  odometer (side 1 through its line, then side 0 moves on one), and the HP
  left decides only once every pairing of the fighters left has stalled:
  the HP never decides a match the benches could. Rotating both sides at
  once reached only a diagonal of the pairings (found in review). No abilities, items, statuses, stat stages, recoil or priority. `@pkmn/sim` would model all of it, but needs a set, an AI and a
  heavy dependency per species; it stays a possible upgrade.
- **Move accuracy joins the snapshot**, from the move responses the ingest
  already fetched. Without it Hydro Pump always beats Surf. PokéAPI gives
  Tachyon Cutter, which never misses, an accuracy of 0; the ingest reads it
  as null, like the 13 moves that never miss.
- **A list by hand of moves the battle never uses** (`UNUSED_MOVES` in
  `battle/domain/simulate.ts`): recharge, charge turns, a user that faints,
  moves that fail outside a condition, power that drops with the user's HP
  (Water Spout, Eruption, Dragon Energy) and another stat than the
  formula's (Body Press, Foul Play). PokéAPI flags none of them, and
  ignoring their rule would make each hit harder than it does: the first
  four kinds would be the best move of half the dex (Giga Impact alone, of
  111 species). Every species keeps at least one move.
- **A run is a row in `battler_runs`**: difficulty, a seed, the picks, the
  rerolls used and whether the team is ordered. Every draw is HMAC-SHA256
  of the seed over its purpose and a counter (`offer:<pick>:<reroll>`,
  `rival:<n>`, `names`, `seat`, `match:<round>:<index>`), so each replays alone and
  nothing derived is stored: the offers, the rivals, the bracket, its result
  and the Nuzlocke unlock all come from the rows.
- **The seed never leaves the server**, nor do the offers to come or, until
  the team is ordered, the rivals. A pick is checked against the current
  offers, and a write lands only on the draft as it was read, so two
  requests at once cannot spend the same offers.
- **One open draft per difficulty**, with "Continue", as in the other
  modes: leaving the board never loses it. No give-up: a draft has no loss
  to count, and finishing one is seven requests, so a give-up would not
  stop anyone dropping a draft; it would add a route for nothing.
- **Rivals carry leader names of our own** ("Leader Cinder"), seven drawn
  by the seed from a list in `battler/domain`: no character of the games
  is borrowed (decided by Pablo on 2026-10-17).
- **The bracket plays out on the client.** The response that orders the
  team carries the whole bracket, no longer secret. A step every 500 ms
  (`battler/domain/reveal.ts`): rivals' matches appear whole; each of the
  player's waits, teams on screen and log empty, for "Begin combat", then
  plays a log line per step. "Skip" jumps to the player's next match. The
  button floats at the bottom of the screen as a portal to `<body>`: the
  entry animation of `main > *` would otherwise pin it to its block. A
  finished run opened again is shown whole (decided by Pablo on
  2026-10-17).
- **A new module, `battler/`**, for the draft and the bracket; the battle
  itself stays in `battle/`, which the battler reaches through its index.
  `battler/domain` takes `random` and `play` as arguments, since a domain
  imports no other module.

## Consequences

- A change to the simulation, the pools or the move list replays every
  finished run under the new rules: brackets and the Nuzlocke unlock can
  change. There is no production database yet.
- The Nuzlocke unlock replays the player's finished hard runs, seven
  battles each (about 0.3 ms per battle measured, with fighters built once
  per species and best moves once per pairing); store the result if a
  heavy player's page gets slow.
- Other moves the calculator marks as inexact (Psyshock, Freeze-Dry,
  Facade…) are just as inexact here; Body Press and Foul Play, which showed
  up often in measured battles, are left out instead.
