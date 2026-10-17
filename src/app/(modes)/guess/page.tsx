import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { getOverview } from "@modules/guess";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { ContinueLink } from "@shared/ui/ContinueLink";
import { NewGameButton } from "@shared/ui/NewGameButton";
import { StreakSummary } from "@shared/ui/StreakSummary";

export const metadata: Metadata = {
  title: "Dex Clues · Type Matrix",
  description:
    "Guess a species from its types, generation, evolution stage, color, height and weight.",
};

// A player with a game open gets back to it: one game at a time.
export default async function GuessPage() {
  const cookie = (await cookies()).get(PLAYER_COOKIE)?.value;
  const { open, streaks } = await getOverview(cookie && identify(cookie).id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Dex Clues</h1>
        <p className="text-muted">
          Name a species, ten tries. Each guess tells you whether its types and
          color match the answer&apos;s, and whether the answer&apos;s
          generation, evolution stage, height and weight are higher or lower.
          Misses unlock hints: the generation after three, the types after six
          and the first letter and the letters of each word after nine.
        </p>
      </header>
      <section
        aria-labelledby="free-play"
        className="flex flex-col gap-4 border border-muted bg-surface p-4"
      >
        <h2 id="free-play" className="text-xl font-bold">
          Free play
        </h2>
        <p className="text-sm text-muted">
          Each win scores 100, plus 20 per guess left and a point per second
          under three minutes. A loss ends the streak.
        </p>
        <StreakSummary {...streaks} />
        {open ? (
          <ContinueLink href={`/guess/${open}`} />
        ) : (
          <NewGameButton mode="guess" label="New game" />
        )}
      </section>
    </main>
  );
}
