import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GENERATION_NAMES } from "@modules/dex";
import {
  CampaignButton,
  CampaignProgress,
  getCampaign,
  getGame,
  getStreaks,
  HangmanBoard,
  StreakSummary,
} from "@modules/hangman";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = { title: "Hangman · Type Matrix" };

// The board gets the same view the API returns: no answer until it is over.
// What comes after, the campaign or the streak, is drawn only then.
export default async function GamePage({ params }: PageProps<"/hangman/[id]">) {
  const { id } = await params;
  const store = await cookies();
  const playerId = identify(store.get(PLAYER_COOKIE)?.value).id;
  const game = await getGame(id, playerId);
  if (!game) notFound();
  const over = game.status !== "playing";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/hangman"
          className="self-start text-sm text-muted underline"
        >
          ← Hangman
        </Link>
        <h1 className="text-3xl font-bold">
          {game.campaign ? "Hangman campaign" : "Hangman"}
        </h1>
      </header>
      <HangmanBoard key={game.id} initial={game}>
        {over &&
          (game.campaign ? (
            <AfterCampaignGame playerId={playerId} />
          ) : (
            <AfterFreePlayGame playerId={playerId} gens={game.gens} />
          ))}
      </HangmanBoard>
    </main>
  );
}

async function AfterCampaignGame({ playerId }: { playerId: string }) {
  const campaign = await getCampaign(playerId);
  return (
    <div className="flex flex-col gap-4">
      <CampaignProgress campaign={campaign} names={GENERATION_NAMES} />
      <CampaignButton campaign={campaign} names={GENERATION_NAMES} />
    </div>
  );
}

async function AfterFreePlayGame({
  playerId,
  gens,
}: {
  playerId: string;
  gens: number[] | null;
}) {
  const streaks = await getStreaks(playerId);
  return (
    <div className="flex flex-col gap-4">
      <StreakSummary {...streaks} />
      {/* The same generations again; the server checks them again. */}
      <NewGameButton
        mode="hangman"
        body={{ gen: (gens ?? []).map(String) }}
        label="Play again"
      />
    </div>
  );
}
