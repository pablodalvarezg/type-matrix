import type { Run } from "@modules/hangman/domain/score";

const run = ({ wins, points }: Run) =>
  `${points.toLocaleString("en")} points (${wins} ${wins === 1 ? "win" : "wins"})`;

/** The free-play streak still going, and the best one. Only the player sees it. */
export function StreakSummary({ current, best }: { current: Run; best: Run }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 tabular-nums">
      <dt className="text-muted">Streak</dt>
      <dd>{run(current)}</dd>
      <dt className="text-muted">Best</dt>
      <dd>{run(best)}</dd>
    </dl>
  );
}
