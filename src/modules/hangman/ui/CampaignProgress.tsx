import { WINS_PER_GEN, type Campaign } from "@modules/hangman/domain/campaign";

/**
 * The generations in order: finished, being played, locked. Each state has
 * its own mark and words, not only a tone.
 */
export function CampaignProgress({
  campaign: { completed, wins, current },
  names,
}: {
  campaign: Campaign;
  /** Every generation's name, Gen I first. */
  names: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="tabular-nums">
        {current === null
          ? "Campaign complete: every generation is yours."
          : `${names[current - 1]}: ${wins} of ${WINS_PER_GEN} wins.`}
      </p>
      <ol className="flex flex-wrap gap-2 text-sm">
        {names.map((name, index) => {
          const gen = index + 1;
          const done = gen <= completed;
          const playing = gen === current;
          return (
            <li
              key={name}
              aria-current={playing ? "step" : undefined}
              className={`border px-2 py-1 ${
                done
                  ? "border-foreground bg-foreground text-background"
                  : playing
                    ? "border-foreground font-bold"
                    : "border-muted text-muted"
              }`}
            >
              {done ? "✓ " : playing ? "› " : ""}
              {name}
              {!done && !playing && <span className="sr-only"> (locked)</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
