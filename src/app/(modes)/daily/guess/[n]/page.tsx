import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Countdown, getDaily, Leaderboard } from "@modules/daily";
import { GuessBoard, speciesNames } from "@modules/guess";
import { identify, NicknameForm, PLAYER_COOKIE } from "@modules/players";

export const metadata: Metadata = {
  title: "Daily Stats & types · Type Matrix",
};

// The same board as free play. The streak and the leaderboard are rendered
// here, on the server, once the game is over: the board refreshes the page
// on the response that ends it.
export default async function DailyGuessPage({
  params,
}: PageProps<"/daily/guess/[n]">) {
  const { n } = await params;
  const store = await cookies();
  const daily = await getDaily(
    "guess",
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
        <h1 className="text-3xl font-bold">
          Daily Stats &amp; types #{game.puzzle}
        </h1>
      </header>
      <GuessBoard key={game.id} initial={game} names={speciesNames}>
        {streak && (
          <p className="flex flex-col gap-1 tabular-nums">
            <span>
              Streak: {streak.current} · best {streak.best}.
            </span>
            <Countdown />
          </p>
        )}
      </GuessBoard>
      {/* Outside the board, whose live region would read the whole table. */}
      {askNickname && (
        <NicknameForm
          prompt="Pick a nickname to join the leaderboard"
          focusOnSave="leaderboard"
        />
      )}
      {leaderboard && <Leaderboard rows={leaderboard} metric="guesses" />}
    </main>
  );
}
