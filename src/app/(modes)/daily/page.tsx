import type { Metadata } from "next";
import Link from "next/link";

import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = {
  title: "Daily puzzle · Type Matrix",
  description: "One Stats & types round a day, the same for everyone.",
};

export default function DailyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Daily puzzle</h1>
        <p className="text-muted">
          One Stats &amp; types round a day, the same species for everyone. Win
          it day after day to keep your streak; a loss or a day skipped ends it.
        </p>
      </header>
      <NewGameButton mode="daily" label="Play today's puzzle" />
    </main>
  );
}
