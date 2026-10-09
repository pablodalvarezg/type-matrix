import { duration } from "@modules/daily/domain/daily";

interface Row {
  place: number;
  nickname: string;
  guesses: number;
  ms: number;
  you: boolean;
}

/** The top 10, then the player's own row if it falls further down. */
export function Leaderboard({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nobody with a nickname has solved it yet.
      </p>
    );
  }

  return (
    <table className="w-full text-left text-sm tabular-nums">
      <caption className="mb-2 text-left font-bold">
        Leaderboard: fewest guesses, then fastest
      </caption>
      <thead>
        <tr className="border-b border-muted">
          <th scope="col" className="py-1 pr-3">
            #
          </th>
          <th scope="col" className="py-1 pr-3">
            Player
          </th>
          <th scope="col" className="py-1 pr-3">
            Guesses
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
            <td className="py-1 pr-3">{row.guesses}</td>
            <td className="py-1 pr-3">{duration(row.ms)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
