import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getGame, HangmanBoard } from "@modules/hangman";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = { title: "Hangman · Type Matrix" };

// The board gets the same view the API returns: no answer until it is over.
export default async function GamePage({ params }: PageProps<"/hangman/[id]">) {
  const { id } = await params;
  const store = await cookies();
  const game = await getGame(id, identify(store.get(PLAYER_COOKIE)?.value).id);
  if (!game) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/hangman"
          className="self-start text-sm text-muted underline"
        >
          ← Hangman
        </Link>
        <h1 className="text-3xl font-bold">Hangman</h1>
      </header>
      <HangmanBoard key={game.id} initial={game}>
        <NewGameButton mode="hangman" label="Play again" />
      </HangmanBoard>
    </main>
  );
}
