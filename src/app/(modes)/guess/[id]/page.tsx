import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getGame, GuessBoard, speciesNames } from "@modules/guess";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = { title: "Stats & types · Type Matrix" };

// The board gets the same view the API returns: no answer until it is over.
export default async function GamePage({ params }: PageProps<"/guess/[id]">) {
  const { id } = await params;
  const store = await cookies();
  const game = await getGame(id, identify(store.get(PLAYER_COOKIE)?.value).id);
  if (!game) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/guess" className="self-start text-sm text-muted underline">
          ← Stats &amp; types
        </Link>
        <h1 className="text-3xl font-bold">Stats &amp; types</h1>
      </header>
      <GuessBoard key={game.id} initial={game} names={speciesNames}>
        <NewGameButton mode="guess" label="Play again" />
      </GuessBoard>
    </main>
  );
}
