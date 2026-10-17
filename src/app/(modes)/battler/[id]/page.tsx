import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Bracket, DraftBoard, getRun } from "@modules/battler";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = { title: "Battler · Type Matrix" };

const NAMES = { easy: "Easy", hard: "Hard", nuzlocke: "Nuzlocke" };

// The board gets this pick's offers and nothing ahead of them; the bracket
// is drawn only once the team is ordered.
export default async function RunPage({ params }: PageProps<"/battler/[id]">) {
  const { id } = await params;
  const store = await cookies();
  const run = await getRun(id, identify(store.get(PLAYER_COOKIE)?.value).id);
  if (!run) notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/battler"
          className="self-start text-sm text-muted underline"
        >
          ← Battler
        </Link>
        <h1 className="text-3xl font-bold">
          Battler · {NAMES[run.difficulty]}
        </h1>
      </header>
      {run.rounds ? (
        <>
          <Bracket rounds={run.rounds} wins={run.wins!} />
          <NewGameButton
            mode="battler"
            body={{ difficulty: run.difficulty }}
            label="Play again"
          />
        </>
      ) : (
        <DraftBoard
          key={`${run.picks.length}:${run.rerollsLeft}:${run.stage}`}
          initial={run}
        />
      )}
    </main>
  );
}
