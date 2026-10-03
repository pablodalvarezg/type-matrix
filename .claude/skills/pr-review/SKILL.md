---
name: pr-review
description: "Three-pass review of the current branch before a pull request: a broad correctness sweep, an adversarial second correctness pass, then over-engineering. Tags every finding FIX or CHECK and closes with a GTG or FIX verdict. Use when the user says /pr-review, asks for a review before opening or merging a PR, or asks whether a branch is good to go."
---

# Three-pass review before a pull request

Run all three passes over the same diff, then report **once**. Three reports is a
failure of this skill, not a thorough use of it.

Scope is `main...HEAD` unless the user names another target (a PR number, a
branch, a path). State the scope you used at the top of the report.

## Pass 1 — correctness, broad

Invoke the `code-review` skill.

Sweep the whole diff for real defects: broken logic, unhandled failures, holes in
the types, accessibility regressions, and violations of the dependency rules in
this repo's `CLAUDE.md`.

Explicitly **not** in scope: formatting, or naming preferences.

## Pass 2 — correctness, adversarial

Invoke `code-review` a second time with one job: **refute pass 1.**

This pass is not a second sweep. If it reports the same findings again in
different words, it has done nothing and the review is weaker than a single pass,
because it dressed one opinion up as two.

Take every finding from pass 1 and argue against it **from the code**. Go looking
for the reason it is wrong:

- a guard that already exists upstream of the line in question
- a caller that cannot reach the state the finding assumes
- an API that does not behave the way the finding claims
- an installed version where the claim stopped being true
- a proposed fix that would not actually work

A finding survives only when the attempt to refute it fails. For each one,
report `refuted` — with the evidence that kills it — or `survives`, with what the
refutation attempt ran into. Refuted findings do not reach the final report
except as one line saying they were dropped and why.

Only then, with what is left, hunt where pass 1 moved fast: error paths, boundary
conditions, the files it barely opened. Anything new goes through the same
refutation test before it gets reported.

## Pass 3 — over-engineering

Invoke the `ponytail:ponytail-review` skill.

Only what can be deleted: speculative abstractions, reinvented standard library,
a dependency that replaces a few lines, scaffolding for a future that has not
arrived.

## Output

One report. The three passes as separate sections, findings ordered by severity
within each. A pass that found nothing gets one line saying so — no filler.

Tag every finding and close with a verdict using the rules in the **"Tags y
veredicto de review"** section of this repo's `CLAUDE.md`. That section is the
single source for them; do not restate the rules here.

## Before reporting a finding

Verify each claim against the code, the installed version, or the vendor's
documentation. A confidently wrong finding costs more than a missed one: it sends
someone to fix what was not broken, or proposes a fix that does not work. If
something cannot be checked, say it is unverified rather than asserting it.

This repo vendors the Next.js documentation at `node_modules/next/dist/docs/`,
and `AGENTS.md` requires reading it before writing App Router code. The same rule
applies to reviewing: read it before **reporting** a finding about the framework.
The version in the tree is the authority, not the recollection of an earlier one.

## Checks worth running rather than assuming

Failure modes where reading the code is not enough because the broken state
looks green.

**The answer can leak while build, lint and tests all stay green.** This is the
project's thesis, so it gets checked on every diff that touches a game mode, a
route handler, or a Server Component that renders a game. Look for the answer —
species id or name — reaching the client by any path:

- a response body before the game is over, including error responses and
  "invalid guess" feedback that echoes more than the guess;
- a prop passed from a Server Component to a Client Component. Props are
  serialised into the RSC payload whether or not the component renders them, so
  "the client component never displays it" is not a defence. Check what is
  passed, not what is shown;
- the HTML of a server-rendered game page;
- a module reachable from the client that loads the snapshot without
  `server-only`.

Once the no-leak test exists (step 6 of the plan), run it rather than assume it
ran, and check that the diff did not narrow what it searches for. Before it
exists, a diff that adds a game path without it is a `FIX`.

Be precise about the framework, because the obvious phrasing is wrong in both
directions. Adding `"use client"` does **not** keep a component's output out of
the initial HTML — client components are still server-rendered. And moving the
answer into a Server Component that never passes it down **does** keep it out:
what a Server Component computes and does not pass or render stays on the server.

**The boundary rules can pass without checking a single import.** Atlas lost them
twice: once to `unrs-resolver`'s install script being blocked (it must be named,
without a version, in `package.json#allowScripts`), and once to an import of a
path that does not exist, which resolves to nothing and is silently not checked.
`tests/boundaries.test.ts` guards both by linting virtual files at real layer
paths that import a real file. Run it. If the diff adds a layer or an element
pattern to `eslint.config.mjs`, check the test covers it. For a doubt the test
does not cover, write a temporary fixture that violates the rule — `domain/`
importing `@shared/`, `app/` deep-importing `@modules/x/data/`, one module's
`ui/` reaching into another's layers — **importing a path that exists**, confirm
it errors, then delete it.

**A colour change can break AA silently in the other theme.** The tokens live in
`src/app/globals.css` in two blocks, light and dark. `tests/theme-contrast.test.ts`
reads that file and checks the four text pairs in each theme. A diff that adds a
tone, renames one, or puts text on a pair the test does not list needs the test
updated in the same diff.

**The formulas can be off by one and still look plausible.** For a diff touching
`battle/domain`, check that expected values in the tests come from the reference
calculator (the README names it as the oracle), not from running the code under
test. A test vector derived from the implementation proves nothing. Check the
rounding at each step of the modifier chain against the README's order, and that
`pokeRound` rounds half down.
