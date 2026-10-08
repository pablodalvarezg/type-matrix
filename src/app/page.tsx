import Link from "next/link";

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
  { name: "Daily puzzle", blurb: "One round a day, the same for everyone." },
];

export default function Home() {
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
        {modes.map((mode) => (
          <li
            key={mode.name}
            className="flex flex-col gap-1 border border-muted bg-surface p-4"
          >
            {mode.href ? (
              <Link href={mode.href} className="font-bold underline">
                {mode.name}
              </Link>
            ) : (
              <span className="font-bold">{mode.name}</span>
            )}
            <span className="text-muted">{mode.blurb}</span>
            {!mode.href && (
              <span className="text-sm text-muted">[ coming soon ]</span>
            )}
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
