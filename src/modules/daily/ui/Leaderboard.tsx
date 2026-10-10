import { duration } from "@modules/daily/domain/daily";

interface Row {
  place: number;
  nickname: string;
  /** Guesses or misses, as `metric` says. */
  score: number;
  ms: number;
  you: boolean;
}

/**
 * The top 10, then the player's own row if it falls further down. The
 * section stays put when its rows change, so it can keep the focus.
 */
export function Leaderboard({
  rows,
  metric,
}: {
  rows: Row[];
  metric: "guesses" | "misses";
}) {
  return (
    <section
      id="leaderboard"
      tabIndex={-1}
      aria-label="Leaderboard"
      className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          Nobody with a nickname has solved it yet.
        </p>
      ) : (
        <table className="w-full text-left text-sm tabular-nums">
          <caption className="mb-2 text-left font-bold">
            Leaderboard: fewest {metric}, then fastest
          </caption>
          <thead>
            <tr className="border-b border-muted">
              <th scope="col" className="py-1 pr-3">
                #
              </th>
              <th scope="col" className="py-1 pr-3">
                Player
              </th>
              <th scope="col" className="py-1 pr-3 capitalize">
                {metric}
              </th>
              <th scope="col" className="py-1 pr-3">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.place}
                className={`${row.you ? "font-bold" : ""} ${row.place > index + 1 ? "border-t border-muted" : ""}`}
              >
                <td className="py-1 pr-3">{row.place}</td>
                <th
                  scope="row"
                  className={`py-1 pr-3 ${row.you ? "" : "font-normal"}`}
                >
                  {row.nickname}
                  {row.you && " (you)"}
                </th>
                <td className="py-1 pr-3">{row.score}</td>
                <td className="py-1 pr-3">{duration(row.ms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
