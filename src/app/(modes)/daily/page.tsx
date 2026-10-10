import type { Metadata } from "next";
import Link from "next/link";

import { Countdown } from "@modules/daily";
import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = {
  title: "Daily puzzle · Type Matrix",
  description:
    "A Stats & types round and a Hangman round a day, the same for everyone.",
};

const ROUNDS = [
  {
    mode: "guess",
    name: "Stats & types",
    blurb: "Guess the species from its types and base stats.",
  },
  {
    mode: "hangman",
    name: "Hangman",
    blurb: "Spell another species, letter by letter.",
  },
] as const;

export default function DailyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Daily puzzle</h1>
        <p className="text-muted">
          Two rounds a day, each with its own species, the same for everyone.
          Each keeps its own streak: win it day after day, and a loss or a day
          skipped ends it.
        </p>
        <Countdown />
      </header>
      {ROUNDS.map((round) => (
        <section
          key={round.mode}
          aria-labelledby={`${round.mode}-heading`}
          className="flex flex-col gap-3 border border-muted bg-surface p-4"
        >
          <h2 id={`${round.mode}-heading`} className="font-bold">
            {round.name}
          </h2>
          <p className="text-muted">{round.blurb}</p>
          <NewGameButton
            mode={round.mode}
            daily
            label={`Play today's ${round.name}`}
          />
        </section>
      ))}
    </main>
  );
}
