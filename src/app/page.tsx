import { cookies } from "next/headers";
import Link from "next/link";

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
        {/* The whole card clicks, but only the title is the link, so its
            name stays the title while the daily card's countdown ticks: the
            link's ::after covers the card, and reaches 1px past its right and
            bottom so the strip the lift uncovers still clicks. The li, which
            never moves, takes the hover: if the lifted card took it, a pointer
            on its edge would fall off after the lift and the card would
            flicker. Keyboard focus gets the same lift and outlines the card. */}
        {modes.map((mode) => (
          <li key={mode.name} className="group">
            <div className="relative flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border border-muted bg-surface p-4 transition-[translate,box-shadow] group-focus-within:shadow-pixel group-hover:shadow-pixel has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-foreground motion-safe:group-focus-within:-translate-x-px motion-safe:group-focus-within:-translate-y-px motion-safe:group-hover:-translate-x-px motion-safe:group-hover:-translate-y-px">
              <span className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                {/* The underline is a background that grows from the left on
                    hover; on leave it anchors right and shrinks, so it leaves
                    left to right too. Leaving mid-sweep makes the partial bar
                    jump to the right edge: any CSS that avoids the jump breaks
                    that direction on a full leave. */}
                <Link
                  href={mode.href}
                  className="self-start bg-[linear-gradient(currentColor,currentColor)] bg-size-[0_2px] bg-position-[right_bottom] bg-no-repeat pb-px font-bold transition-[background-size] duration-300 group-focus-within:bg-size-[100%_2px] group-focus-within:bg-position-[left_bottom] group-hover:bg-size-[100%_2px] group-hover:bg-position-[left_bottom] after:absolute after:-inset-px after:-right-0.5 after:-bottom-0.5 focus-visible:outline-none"
                >
                  {mode.name}
                </Link>
                <span className="text-muted">{mode.blurb}</span>
              </span>
              {mode.href === "/daily" && (
                <span className="flex shrink-0 flex-col items-start text-sm tabular-nums sm:items-end">
                  {streaks && (
                    <>
                      <span>Stats &amp; types streak: {streaks.guess}</span>
                      <span>Hangman streak: {streaks.hangman}</span>
                    </>
                  )}
                  <Countdown />
                </span>
              )}
            </div>
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
