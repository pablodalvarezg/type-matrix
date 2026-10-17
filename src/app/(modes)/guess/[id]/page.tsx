import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GENERATION_NAMES } from "@modules/dex";
import { getGame, getStreaks, GuessBoard, speciesNames } from "@modules/guess";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { NewGameButton } from "@shared/ui/NewGameButton";
import { StreakSummary } from "@shared/ui/StreakSummary";

export const metadata: Metadata = { title: "Dex Clues · Type Matrix" };

// The board gets the same view the API returns: no answer until it is over.
// The streak is drawn only then.
export default async function GamePage({ params }: PageProps<"/guess/[id]">) {
  const { id } = await params;
  const store = await cookies();
  const playerId = identify(store.get(PLAYER_COOKIE)?.value).id;
  const game = await getGame(id, playerId);
  if (!game) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/guess" className="self-start text-sm text-muted underline">
          ← Dex Clues
        </Link>
        <h1 className="text-3xl font-bold">Dex Clues</h1>
      </header>
      <GuessBoard
        key={game.id}
        initial={game}
        names={speciesNames}
        generations={GENERATION_NAMES}
      >
        {game.status !== "playing" && <AfterGame playerId={playerId} />}
      </GuessBoard>
    </main>
  );
}

async function AfterGame({ playerId }: { playerId: string }) {
  const streaks = await getStreaks(playerId);
  return (
    <div className="flex flex-col gap-4">
      <StreakSummary {...streaks} />
      <NewGameButton mode="guess" label="Play again" />
    </div>
  );
}
