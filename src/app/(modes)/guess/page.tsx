import type { Metadata } from "next";
import Link from "next/link";

import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = {
  title: "Stats & types · Type Matrix",
  description: "Guess a species from its types and base stats.",
};

export default function GuessPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Stats &amp; types</h1>
        <p className="text-muted">
          Name a species. Each guess tells you whether its types match the
          answer&apos;s, and whether each base stat of the answer is higher,
          lower or equal.
        </p>
      </header>
      <NewGameButton mode="guess" label="New game" />
    </main>
  );
}
