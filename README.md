# Type Matrix

A game room built on creature data. **Not a Pokédex**: nobody comes here to look up an entry. They come to build a team, run a damage calculation, or play today's puzzle.

> Unofficial fan project. Not affiliated with Nintendo, Game Freak or The Pokémon Company. Species data from [PokéAPI](https://pokeapi.co). No official art is used anywhere, and the project is not monetised.

Side project #2 of [Pablo Álvarez Graña's portfolio](https://github.com/pablodalvarezg). Its case study goes on the portfolio under the slug `type-matrix`, and the repo uses the same slug.

---

## What it does

| Mode | What the player does | Where the answer lives |
|---|---|---|
| **Battle calculator** | Picks attacker, defender, move, level, IVs, EVs and nature, and gets the damage range and the percentage of the defender's HP | No answer. Pure calculation |
| **Team builder** | Builds a team of 6 and sees shared weaknesses and offensive coverage | No answer. Pure calculation |
| **Hangman** | Guesses a species name letter by letter | Server only |
| **Stats & types** | Guesses a species from feedback on its types and base stats, Wordle-style | Server only |
| **Daily puzzle** | One Stats & types round per day, the same for everyone, with streaks and a leaderboard | Server only |

### Why there is no silhouette mode

The original idea was a silhouette that un-pixelates with each miss. That needs official art, and the project uses none. **Stats & types** replaces it: you guess the species from its numbers instead of its shape. It is harder, it says more about the data, and it carries no legal risk.

---

## The hard parts

These are why the project exists. The UI is a vehicle for them.

### 1. The client never knows the answer

Most games of this kind send the answer to the browser and hide it with CSS or JavaScript. Here, every check runs on the server, and **the solution never leaves it until the game is over**.

- A game is a row in the database. The client holds a game id, never the answer.
- Each guess is a `POST`. The server validates it, stores it, and returns only the feedback for that guess.
- The answer appears in a response only once the game ends (won or out of guesses).
- **Watch the Next.js-specific leak:** any prop that a Server Component passes to a Client Component is serialised into the RSC payload and reaches the browser. The answer must never be a prop. The module that loads the species data imports `server-only`.
- The game rules double as the rate limit: guesses per game are capped on the server, so there is nothing to brute-force.

The proof is a test: it plays a full game through the API and checks that **no response before the last one contains the answer**, by id or by name.

### 2. The daily puzzle is deterministic, but not guessable

The puzzle for any given day has to be rebuildable at any time, without a cron job and without storing it in advance. That makes it a function:

```
answer(n) = shuffle(POOL, seed = HMAC(DAILY_SECRET, poolVersion))[n mod POOL.length]
```

- `n` is the puzzle number: days since launch, plus one.
- **The repo is public**, so a seed derived from the date alone would let anyone compute tomorrow's answer from the source code. The server-side `DAILY_SECRET` is what prevents that.
- Shuffling the pool once (instead of hashing each day) means no repeats until the pool cycles.
- **`POOL` and `DAILY_SECRET` are frozen.** Changing either one rewrites every past puzzle. If the pool ever has to change, it becomes a new pool version that takes effect from a given puzzle number, and older numbers keep resolving against the old version.

No scheduler: the puzzle is computed, not published.

### 3. Days, timezones and streaks

"Today" depends on where the player is. The rules:

- The client sends its local date. The server turns it into a puzzle number and **accepts it only if that date is "today" somewhere on Earth** (UTC−12 to UTC+14). That window holds at most two or three puzzle numbers at any moment.
- One game per player per puzzle, enforced with a unique constraint, not with application code.
- **A streak counts consecutive puzzle numbers won**, not calendar days. A loss or a missed puzzle resets it. It is derived from the results table, never stored as a counter that can drift.
- Leaderboard per puzzle: fewest guesses first, then shortest **server-measured** time (from game creation to the winning guess). The client's clock is never trusted.

### 4. The damage formula has more modifiers than it looks like

Generation IX mechanics, singles.

**Stats:**

```
HP    = floor((2·Base + IV + floor(EV/4)) · Level / 100) + Level + 10
Other = floor((floor((2·Base + IV + floor(EV/4)) · Level / 100) + 5) · Nature)   # Nature: 1.1 / 1.0 / 0.9
```

Edge case: Shedinja always has 1 HP.

**Damage:**

```
base = floor(floor(floor(2·Level/5 + 2) · Power · A / D) / 50) + 2
```

Then the modifiers, **in this order and with rounding at each step**: critical hit (×1.5, floored), random roll (85–100, `floor(base · roll / 100)`), STAB (×1.5, `pokeRound`), type effectiveness (product over the defender's types, 0 for immunity, floored), burn (×0.5 on physical moves, floored). Game Freak's rounding rounds half down, not half up (`pokeRound`); getting that wrong gives results that are off by one in some cases. Which step uses which rounding follows the reference calculator. Minimum damage is 1 unless the target is immune.

The output is the full range of 16 rolls, plus min and max as a percentage of the defender's HP.

**Out of scope for v1, on purpose:** abilities, held items, weather, terrain, Terastallization, doubles and multi-target spread. Each one is a modifier that slots into the chain later. The UI says so instead of showing a number that looks complete.

**Test vectors** come from a known reference calculator (for example Smogon's damage calc), copied by hand into the tests as expected numbers. That calculator is a test oracle, not a dependency.

### 5. Team analysis

- **Shared weaknesses:** for each of the 18 attacking types, how many team members take ×2 or more, and how many resist or are immune. Two members weak to the same type and nobody resisting it: that is the warning.
- **Offensive coverage (v1):** for each defending type, the best multiplier achievable using the team's **STAB types**. Coverage by chosen moves comes later.
- **Dual-type defenders:** coverage also counts every two-type combination that some species in the snapshot has, taken from the snapshot rather than a hand-written list, each once (Fire/Flying and Flying/Fire are the same defender). The ones the team's best STAB hits for ×1 or less are listed as gaps, even when each half on its own is covered.
- **Team rules:** up to six species (`member.1` … `member.6` in the URL), one of each like the Species Clause; a partial team is analysed with the members it has.
- Type chart: generation 6 onwards (with Fairy). Dual types multiply.

---

## Stack

Everything has to run on free plans. The accepted cost ceiling for the whole portfolio is a domain name.

| Piece | Choice | Why |
|---|---|---|
| Framework | **Next.js 16**, App Router, **with a server** (no `output: 'export'`) | Same framework as the portfolio. Route handlers are the backend: one repo, one deploy |
| Language | TypeScript `strict` | |
| Styles | Tailwind CSS 4 + theme tokens in CSS custom properties | |
| Validation | Zod, on every request body and on the environment | |
| Database | **Neon Postgres** (free) | The default free Postgres: it sleeps after 5 minutes but does not expire |
| DB access | `@neondatabase/serverless` + plain SQL in the repositories | Four or five tables do not need an ORM. If you want one, justify it |
| Migrations | Numbered `.sql` files in `db/migrations/`, applied in order by a short script that records them in a `schema_migrations` table | |
| Species data | **PokéAPI snapshot, committed to the repo** | See below |
| Tests | Vitest (unit), Playwright (smoke) | |
| Deploy | Vercel Hobby | |
| Runtime | Node 24.21.0, npm | |

### Species data: snapshot, not runtime calls

PokéAPI asks consumers to cache. The strongest cache is not calling it in production at all.

- `scripts/ingest.ts` downloads what is needed once — species (id, English name, types, base stats, and the damaging moves each one can learn), moves (name, type, category, power) and the type chart — with limited concurrency to be polite. Each species gets the learnset of the most recent mainline game it appears in: Scarlet/Violet first, older games only for species that game left out.
- It writes `data/snapshot.json`, which is committed. The app reads only that file, and only on the server.
- Re-running the ingest is a manual decision, and the diff shows exactly what changed.
- **No sprites are downloaded.** Not even to process them.

### Identity

No login and no OAuth.

- The first time a player saves something (a nickname, a game), the server issues a random player id in a signed `httpOnly` cookie. Visitors who only look leave no row behind.
- The player picks a nickname the first time they appear on a leaderboard: 3 to 16 letters, digits, `_` or `-`, unique regardless of case (a database index, not application code).
- Accepted ceiling: clearing the cookie means starting over with no streak. If that becomes a real problem, a magic-link login is the upgrade.

### Environment variables

Validated with Zod in `src/shared/config/env.ts`, which makes the build fail when one is missing. Nothing else in the app reads `process.env`; the migration script reads `DATABASE_URL` itself because scripts cannot import from `src/`.

| Variable | Use |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `DAILY_SECRET` | Seed for the daily puzzle. **Never rotated** |
| `COOKIE_SECRET` | Signs the player id cookie |
| `LAUNCH_DATE` | Date of puzzle #1, `YYYY-MM-DD` |

---

## Architecture

**A modular monolith**, same rules as the portfolio: a module per domain, a public API in each module's `index.ts`, and one-way dependencies enforced with `eslint-plugin-boundaries`.

```
src/
├─ app/                          # Routing and composition only
│  ├─ (modes)/calculator, team, hangman, guess, daily
│  └─ api/<mode>/.../route.ts    # Thin: parse with the schema, call the service, map errors to HTTP
├─ modules/
│  ├─ dex/                       # Snapshot loader (server-only), species/move/type types, type chart
│  ├─ battle/                    # Stats and damage. Pure domain, the most heavily tested code in the repo
│  ├─ team/                      # Weaknesses and coverage. Pure domain
│  ├─ hangman/                   # Name normalisation and masking (domain), game service, repository
│  ├─ guess/                     # Stats & types feedback (domain), game service, repository
│  ├─ daily/                     # Puzzle number, timezone window, seeded selection, streaks
│  ├─ players/                   # Cookie identity, nickname
│  └─ leaderboard/
└─ shared/
   ├─ ui/                        # Design-system primitives
   ├─ db/                        # Neon client
   └─ config/                    # env.ts
```

Inside a module:

- `domain/`: pure TypeScript. No Next, React, DOM or I/O. Unit-tested.
- `data/` or `*.repository.ts`: the only place with SQL or file reads. Returns domain types.
- `*.service.ts`: game rules. It knows neither HTTP nor the concrete database.
- `*.schema.ts`: Zod for input and output.
- `ui/`: receives props, never fetches data.

This tree is **where things go, not what has to exist on day one**. A module is created when its step in the plan arrives.

### Hangman, details that are easy to miss

Names like `Mr. Mime`, `Farfetch'd`, `Type: Null`, `Nidoran♀` and `Flabébé`. Letters are compared with accents folded (`é` → `e`), and anything that is not a letter (spaces, dots, apostrophes, symbols) is revealed from the start. The word's length and shape are public; its letters are not.

- The answer is any of the 1025 species in the snapshot. Six misses end the game.
- A game belongs to the player who started it: starting one issues the player cookie, and with any other cookie the game is a 404.
- A repeated letter is refused and costs nothing. Two guesses sent at once cannot both count: the second is refused, so the miss cap holds.
- The API is `POST /api/hangman/games` and `POST /api/hangman/games/{id}/guesses` with `{ "letter": "a" }`. Each response is the public view of the game: the mask, the letters tried, the misses left and the status, plus the answer once it is over.

### Stats & types, feedback per guess

For each guessed species the server returns: types (exact match, partial match, none), and each base stat (higher, lower, equal). Guesses are capped per game. The list of species names for autocomplete can travel to the client: it is the guess space, not the answer.

- The answer is any of the 1025 species in the snapshot. Eight guesses per game.
- Types get one verdict per guess: **exact** (the same types, in any order), **partial** (at least one shared) or **none**. Each of the six base stats gets an arrow: the answer's is higher, lower or equal.
- A species already guessed, or a name that is not a species, is refused and costs nothing. Ownership and concurrent guesses work as in Hangman.
- Once the game is over, the answer comes back in full: name, types and base stats.
- The API is `POST /api/guess/games` and `POST /api/guess/games/{id}/guesses` with `{ "species": "Mr. Mime" }` (a name or slug). Each response is the public view of the game: one row per guess with its feedback, the guesses left and the status, plus the answer once it is over.

### Daily puzzle, details that are easy to miss

A daily game is a Stats & types game with a puzzle number: same rules, same board, same guesses endpoint.

- `POOL_V1` is the 1025 snapshot slugs, committed as a list so a re-ingest cannot change it. The shuffle sorts it by `HMAC(HMAC(DAILY_SECRET, "v1"), slug)`.
- `POST /api/daily/games` with `{ "date": "YYYY-MM-DD" }`, the browser's local date. A date that is not today anywhere, or before launch, is a 400. Starting again returns the same game: the table has a unique key on player and puzzle. The page is `/daily/{n}`, and only the player's own game is found there.
- **Streaks** (current and best) appear once the game is over. The current one stays alive while today's puzzle is unplayed, and ends with a loss or a puzzle skipped.
- **A puzzle closes when its date is no longer today anywhere**: 12:00 UTC the next day. An unfinished game is lost from then on and takes no more guesses, so an answer seen elsewhere cannot win it late and mend a streak.
- The server never sees the player's date on that page, so it takes today to be the earliest puzzle still open somewhere, or the latest one the player has played if that is later. A puzzle skipped can show as a break up to a day late.

---

## Visual identity

- Retro handheld, reinterpreted and restrained: a subtle pixel grid, a **4-tone palette**, monospace typography.
- **AA contrast is the hard constraint.** The classic four greens fail AA between neighbouring tones. Pick the tones so that every text/background pair passes, and check it when the theme is defined, not at the end.
- **Feedback never relies on colour alone.** With four tones that would be both inaccessible and ambiguous: use arrows, symbols and text.
- Tokens as CSS custom properties. No colours, fonts or radii hard-coded in components.
- No logos, sprites or official art. Any icon is original, except the favicon (`src/app/icon.svg`): a Poké Ball.

---

## Running locally

```bash
nvm use 24.21.0
npm install
cp .env.example .env.local   # and fill it in
npm run db:migrate
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Local server |
| `npm run build` | Production build |
| `npm run check` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the boundaries rules |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright |
| `npm run ingest` | Regenerates `data/snapshot.json` from PokéAPI |
| `npm run db:migrate` | Applies pending migrations |

---

## Build plan (for the agent)

> This section is for whoever is building the project. When the project is finished, it moves to `CLAUDE.md` or gets deleted, and the README stays as the public README.

### Working rules

- **First task:** create this repo's `CLAUDE.md` from the portfolio's (Pablo provides it), adapted: it keeps the architecture, conventions, workflow and *Don't* sections, and replaces the portfolio-specific parts with this project's. Copy the `pr-review` skill from `.claude/skills/` as well.
- `AGENTS.md` is written by `next dev`, and it is right: read `node_modules/next/dist/docs/` before using a Next API. This version differs from what a model knows.
- **The agent never commits or pushes on its own.** It works on the active branch and leaves the tree dirty. Pablo decides on commits, branches and PRs. When he does ask: one task per branch, never directly to `main`, tags `[ADD]` `[UPD]` `[FIX]` `[PAT]` in the subject, push with `git push -u origin HEAD`.
- For non-trivial tasks: a short plan first, then wait for confirmation.
- A task is done when `npm run check && npm run lint && npm test` pass.
- Code, names, comments and commits in English.
- **Don't invent data.** Anything missing becomes `TODO(pablo):`.
- If a product decision is ambiguous, ask. Don't assume.

### Steps, in order

Each step ends green. There is one deploy, at close-out, once every mode exists.

1. **Scaffold.** Next 16, strict TS, Tailwind 4, ESLint with boundaries (checked with a fixture that should fail), Prettier, Vitest, `env.ts`, `CLAUDE.md`. Theme tokens and the AA check of the palette.
2. **Data.** `scripts/ingest.ts`, `data/snapshot.json`, `dex` module, type chart. Tests: dual types, immunities.
3. **Battle calculator.** `battle/domain` first, with the reference test vectors and the edge cases (Shedinja, immunity, minimum damage of 1, rounding). UI afterwards.
4. **Team builder.** `team/domain` with tests, then UI.
5. **Players and database.** Neon, migrations, signed cookie, nickname.
6. **Hangman, free play.** Server-validated, plus the answer-leak test.
7. **Stats & types, free play.** Same engine, same test.
8. **Daily puzzle and streaks.** Puzzle number, timezone window, seeded selection, streaks derived from results. Tests: determinism, different secret → different answer, window boundaries, gap breaks the streak.
9. **Leaderboard.**
10. **Close-out.** Deploy to Vercel with the four environment variables, Playwright smoke (one test per mode), Lighthouse ≥ 90 on mobile, responsive from 360 px, public README with screenshots, and **measured numbers** for the case study.

### Pending decisions, with a default

Mark each one as `TODO(pablo):` in the code where it applies, use the default, and keep going.

| Decision | Default |
|---|---|
| Species pool for the daily puzzle (all of them or a subset) | All species in the snapshot, frozen as `POOL_V1` |
| Guess cap in Stats & types | 8 |
| Wrong letters allowed in Hangman | 6 |
| Site language | English only. PokéAPI has Spanish names if it is ever needed |
| Launch date (`LAUNCH_DATE`) | The day of the first deploy with the daily puzzle |

### Definition of done

- [ ] Live demo and public repo with this README (screenshots, stack, instructions).
- [ ] Case study published on the portfolio with the `type-matrix` theme. It is written in the portfolio repo, not in this one.
- [ ] Lighthouse ≥ 90 and responsive from 360 px.
- [ ] Tests on the core logic: damage, stats, types, team, daily puzzle, streaks, and the no-leak test.
- [ ] The Type Matrix card on the portfolio hub goes from "Coming soon" to published.

### Don't

- Sprites, official art, logos, or the franchise name as product branding. The favicon is the one exception.
- Calls to PokéAPI at runtime.
- Login, OAuth, or paid services.
- Microservices, queues, or a separate backend. The route handlers are the backend.
- Answers in the HTML, the RSC payload, or any response before the game ends.
- Metrics that were not measured.
