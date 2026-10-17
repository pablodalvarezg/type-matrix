import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { GENERATION_NAMES } from "@modules/dex";
import {
  CampaignButton,
  CampaignProgress,
  FreePlayForm,
  getOverview,
} from "@modules/hangman";
import { identify, PLAYER_COOKIE } from "@modules/players";
import { StreakSummary } from "@shared/ui/StreakSummary";
import { ContinueLink } from "@shared/ui/ContinueLink";

export const metadata: Metadata = {
  title: "Hangman · Type Matrix",
  description:
    "Guess a species name, letter by letter: a campaign through the generations, or free play.",
};

// Each mode has at most one open game, and the player gets back to it.
export default async function HangmanPage() {
  const cookie = (await cookies()).get(PLAYER_COOKIE)?.value;
  const { campaign, streaks, open } = await getOverview(
    cookie && identify(cookie).id,
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Hangman</h1>
        <p className="text-muted">
          A species name, letter by letter. Accents don&apos;t matter, and
          anything that isn&apos;t a letter is shown from the start.
        </p>
      </header>

      <section
        aria-labelledby="campaign"
        className="flex flex-col gap-4 border border-muted bg-surface p-4"
      >
        <h2 id="campaign" className="text-xl font-bold">
          Campaign
        </h2>
        <p className="text-sm text-muted">
          One generation at a time, from Gen I. Ten wins finish it; each loss
          takes one back, but a finished generation stays finished.
        </p>
        <CampaignProgress campaign={campaign} names={GENERATION_NAMES} />
        {open.campaign ? (
          <ContinueLink href={`/hangman/${open.campaign}`} />
        ) : (
          <CampaignButton campaign={campaign} names={GENERATION_NAMES} />
        )}
      </section>

      <section
        aria-labelledby="free-play"
        className="flex flex-col gap-4 border border-muted bg-surface p-4"
      >
        <h2 id="free-play" className="text-xl font-bold">
          Free play
        </h2>
        <p className="text-sm text-muted">
          Each win scores 100, plus 20 per miss left and a point per second
          under three minutes. A loss ends the streak.
        </p>
        <StreakSummary {...streaks} />
        {open.free ? (
          <ContinueLink href={`/hangman/${open.free}`} />
        ) : (
          <FreePlayForm
            names={GENERATION_NAMES}
            completed={campaign.completed}
            campaignDone={campaign.current === null}
          />
        )}
      </section>
    </main>
  );
}
