import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

import { Countdown, getStreaks } from "@modules/daily";
import { identify, PLAYER_COOKIE } from "@modules/players";

const modes = [
  {
    name: "Battle calculator",
    blurb: "Damage range for any matchup.",
    href: "/calculator",
  },
  {
    name: "Team builder",
    blurb: "Shared weaknesses and coverage for six.",
    href: "/team",
  },
  {
    name: "Hangman",
    blurb: "A species name, letter by letter.",
    href: "/hangman",
  },
  {
    name: "Stats & types",
    blurb: "Guess a species from its numbers.",
    href: "/guess",
  },
  {
    name: "Daily puzzle",
    blurb: "A Stats & types and a Hangman round a day, the same for everyone.",
    href: "/daily",
  },
];

// The daily card shows the player's streaks (once they have played) and the
// time to the next puzzle, so the page reads the cookie: rendered per request.
export default async function Home() {
  const cookie = (await cookies()).get(PLAYER_COOKIE)?.value;
  const streaks = cookie ? await getStreaks(identify(cookie).id) : undefined;
  const extras: Record<string, ReactNode> = {
    "/daily": (
      <span className="flex flex-col items-end text-sm tabular-nums">
        {streaks && (
          <>
            <span>Stats &amp; types streak: {streaks.guess}</span>
            <span>Hangman streak: {streaks.hangman}</span>
          </>
        )}
        <Countdown />
      </span>
    ),
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Type Matrix</h1>
        <p className="text-muted">
          A game room built on creature data. Not a dex: build a team, run the
          numbers, play today&apos;s puzzle.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {/* The whole card is the link. The li, which never moves, takes the
            hover: if the lifted card took it, a pointer on its edge would
            fall off after the lift and the card would flicker. The link's
            ::after reaches 1px past its right and bottom, so the strip the
            lift uncovers still clicks. Keyboard focus gets the same lift. */}
        {modes.map((mode) => (
          <li key={mode.name} className="group">
            <Link
              href={mode.href}
              className="relative flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border border-muted bg-surface p-4 transition-[translate,box-shadow] group-focus-within:shadow-pixel group-hover:shadow-pixel after:absolute after:-inset-px after:-right-0.5 after:-bottom-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-safe:group-focus-within:-translate-x-px motion-safe:group-focus-within:-translate-y-px motion-safe:group-hover:-translate-x-px motion-safe:group-hover:-translate-y-px"
            >
              {/* The underline is a background that grows from the left on
                  hover; on leave it anchors right and shrinks, so it leaves
                  left to right too. Leaving mid-sweep makes the partial bar
                  jump to the right edge: any CSS that avoids the jump breaks
                  that direction on a full leave. */}
              <span className="flex flex-col gap-1">
                <span className="self-start bg-[linear-gradient(currentColor,currentColor)] bg-size-[0_2px] bg-position-[right_bottom] bg-no-repeat pb-px font-bold transition-[background-size] duration-300 group-focus-within:bg-size-[100%_2px] group-focus-within:bg-position-[left_bottom] group-hover:bg-size-[100%_2px] group-hover:bg-position-[left_bottom]">
                  {mode.name}
                </span>
                <span className="text-muted">{mode.blurb}</span>
              </span>
              {extras[mode.href]}
            </Link>
          </li>
        ))}
      </ul>

      <footer className="text-sm text-muted">
        Unofficial fan project. Not affiliated with Nintendo, Game Freak or The
        Pokémon Company. Species data from PokéAPI. No official art is used.
      </footer>
    </main>
  );
}
