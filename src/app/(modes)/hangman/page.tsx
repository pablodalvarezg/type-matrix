import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { getOpenGame } from "@modules/hangman";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { ContinueLink } from "@shared/ui/ContinueLink";
import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = {
  title: "Hangman · Type Matrix",
  description: "Guess a species name, letter by letter.",
};

// A player with a game open gets back to it: one game at a time.
export default async function HangmanPage() {
  const cookie = (await cookies()).get(PLAYER_COOKIE)?.value;
  const open = cookie && (await getOpenGame(identify(cookie).id));

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
      {open ? (
        <ContinueLink href={`/hangman/${open.id}`} />
      ) : (
        <NewGameButton mode="hangman" label="New game" />
      )}
    </main>
  );
}
