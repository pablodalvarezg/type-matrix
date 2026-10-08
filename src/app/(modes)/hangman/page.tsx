import type { Metadata } from "next";
import Link from "next/link";

import { NewGameButton } from "@modules/hangman";

export const metadata: Metadata = {
  title: "Hangman · Type Matrix",
  description: "Guess a species name, letter by letter.",
};

export default function HangmanPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Hangman</h1>
        <p className="text-muted">
          A species name, letter by letter. Accents don&apos;t matter, and
          anything that isn&apos;t a letter is shown from the start.
        </p>
      </header>
      <NewGameButton label="New game" />
    </main>
  );
}
