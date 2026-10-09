import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDaily, Leaderboard } from "@modules/daily";
import { GuessBoard, speciesNames } from "@modules/guess";
import { identify, NicknameForm, PLAYER_COOKIE } from "@modules/players";

export const metadata: Metadata = { title: "Daily puzzle · Type Matrix" };

// The same board as free play. The streak and the leaderboard are rendered
// here, on the server, once the game is over: the board refreshes the page
// on the guess that ends it.
export default async function DailyGamePage({
  params,
}: PageProps<"/daily/[n]">) {
  const { n } = await params;
  const store = await cookies();
  const daily = await getDaily(identify(store.get(PLAYER_COOKIE)?.value).id, n);
  if (!daily) notFound();
  const { game, streak, leaderboard, askNickname } = daily;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/daily" className="self-start text-sm text-muted underline">
          ← Daily puzzle
        </Link>
        <h1 className="text-3xl font-bold">Daily puzzle #{game.puzzle}</h1>
      </header>
      <GuessBoard key={game.id} initial={game} names={speciesNames}>
        {streak && (
          <div className="flex flex-col gap-6">
            <p className="tabular-nums">
              Streak: {streak.current} · best {streak.best}. A new puzzle comes
              out tomorrow.
            </p>
            {askNickname && (
              <NicknameForm prompt="Pick a nickname to join the leaderboard" />
            )}
            <Leaderboard rows={leaderboard ?? []} />
          </div>
        )}
      </GuessBoard>
    </main>
  );
}
