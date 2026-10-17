import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { getOverview, RULES } from "@modules/battler";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { ContinueLink } from "@shared/ui/ContinueLink";
import { NewGameButton } from "@shared/ui/NewGameButton";

export const metadata: Metadata = {
  title: "Battler · Type Matrix",
  description:
    "Draft six species and play them through an eight-team bracket, every hit by the exact damage formula.",
};

const MODES = [
  {
    difficulty: "easy",
    name: "Easy",
    blurb: "Rivals bring six at random.",
  },
  {
    difficulty: "hard",
    name: "Hard",
    blurb: "Rivals draft too. Win here to unlock a secret mode.",
  },
  {
    difficulty: "nuzlocke",
    name: "Nuzlocke",
    blurb:
      "Only species that evolve no further, 450 base stats or more. Your team fights in pick order, and whoever faints is gone for good.",
  },
] as const;

// Each difficulty has at most one open draft, and the player gets back to it.
export default async function BattlerPage() {
  const cookie = (await cookies()).get(PLAYER_COOKIE)?.value;
  const { open, nuzlocke } = await getOverview(cookie && identify(cookie).id);
  // The Nuzlocke is a secret until it is unlocked.
  const modes = MODES.filter((m) => m.difficulty !== "nuzlocke" || nuzlocke);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Battler</h1>
        <p className="text-muted">
          Draft six from the offers, then play an eight-team bracket. Every hit
          is the exact damage formula at level 50; abilities, items and status
          moves stay out, and so do the moves whose own rules would break that
          (Hyper Beam, Solar Beam, Explosion…).
        </p>
      </header>

      {modes.map(({ difficulty, name, blurb }) => {
        const { offers, rerolls } = RULES[difficulty];
        return (
          <section
            key={difficulty}
            aria-labelledby={difficulty}
            className="flex flex-col gap-4 border border-muted bg-surface p-4"
          >
            <h2 id={difficulty} className="text-xl font-bold">
              {name}
            </h2>
            <p className="text-sm text-muted">
              {offers} offers a pick,{" "}
              {rerolls ? `${rerolls} rerolls` : "no rerolls"}. {blurb}
            </p>
            {open[difficulty] ? (
              <ContinueLink
                href={`/battler/${open[difficulty]}`}
                hint="To start another, finish this draft."
              />
            ) : (
              <NewGameButton
                mode="battler"
                body={{ difficulty }}
                label="Start a draft"
              />
            )}
          </section>
        );
      })}
    </main>
  );
}
