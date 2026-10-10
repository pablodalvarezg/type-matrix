import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Countdown, getDaily, Leaderboard } from "@modules/daily";
import { HangmanBoard } from "@modules/hangman";
import { identify, NicknameForm, PLAYER_COOKIE } from "@modules/players";

export const metadata: Metadata = { title: "Daily Hangman · Type Matrix" };

// The same board as free play, like the daily Stats & types page: streak and
// leaderboard come from the server once the board refreshes on the end.
export default async function DailyHangmanPage({
  params,
}: PageProps<"/daily/hangman/[n]">) {
  const { n } = await params;
  const store = await cookies();
  const daily = await getDaily(
    "hangman",
    identify(store.get(PLAYER_COOKIE)?.value).id,
    n,
  );
  if (!daily) notFound();
  const { game, streak, leaderboard, askNickname } = daily;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/daily" className="self-start text-sm text-muted underline">
          ← Daily puzzle
        </Link>
        <h1 className="text-3xl font-bold">Daily Hangman #{game.puzzle}</h1>
      </header>
      <HangmanBoard key={game.id} initial={game}>
        {streak && (
          <p className="flex flex-col gap-1 tabular-nums">
            <span>
              Streak: {streak.current} · best {streak.best}.
            </span>
            <Countdown />
          </p>
        )}
      </HangmanBoard>
      {askNickname && (
        <NicknameForm
          prompt="Pick a nickname to join the leaderboard"
          focusOnSave="leaderboard"
        />
      )}
      {leaderboard && <Leaderboard rows={leaderboard} metric="misses" />}
    </main>
  );
}
