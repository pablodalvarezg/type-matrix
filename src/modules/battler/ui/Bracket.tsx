import { Trophy } from "@modules/battler/ui/Trophy";

interface Team {
  name: string;
  you: boolean;
  members: { name: string; fainted: boolean }[];
}

interface Hit {
  kind: "hit";
  side: 0 | 1;
  attacker: string;
  defender: string;
  move: string;
  damage: number | null;
  percent: number;
  critical: boolean;
  effectiveness: number;
  fainted: boolean;
}

interface Swap {
  kind: "swap";
  side: 0 | 1;
  out: string;
  in: string;
}

export interface Match {
  teams: [Team, Team];
  winner: 0 | 1;
  decidedBy: "ko" | "hp";
  events: (Hit | Swap)[];
}

const ROUNDS = ["Quarter-finals", "Semi-finals", "Final"];

const OUTCOMES = [
  "Out in the quarter-finals.",
  "Out in the semi-finals.",
  "Runner-up: you lost the final.",
  "Champion! You won all three rounds.",
];

/** How far the player went: by the matches won. */
const outcomeOf = (wins: number) => OUTCOMES[wins];

const owner = (team: Team) => (team.you ? "Your" : `${team.name}'s`);

function said(event: Hit | Swap, teams: [Team, Team]) {
  if (event.kind === "swap") {
    return `${owner(teams[event.side])} ${event.out} could not hurt the other and went to the back; ${event.in} came in.`;
  }
  const hit = event;
  const who = `${owner(teams[hit.side])} ${hit.attacker} used ${hit.move}`;
  if (hit.damage === null) return `${who}. It missed.`;
  const notes = [
    hit.critical && "a critical hit",
    hit.effectiveness > 1 && "super effective",
    hit.effectiveness < 1 && "not very effective",
  ].filter(Boolean);
  const fainted = hit.fainted
    ? ` ${owner(teams[1 - hit.side]!)} ${hit.defender} fainted.`
    : "";
  return `${who}: ${hit.percent}%${notes.length ? `, ${notes.join(", ")}` : ""}.${fainted}`;
}

/** The outcome; a title gets the big trophy. `id` lets the board focus it. */
export function Outcome({ wins, rounds }: { wins: number; rounds: number }) {
  return (
    <p
      id="outcome"
      tabIndex={-1}
      className="flex animate-pop items-center gap-3 border border-muted bg-surface p-4 text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {wins === rounds && <Trophy className="size-10 shrink-0" />}
      {outcomeOf(wins)}
    </p>
  );
}

/**
 * The bracket, played: each match with both teams as they came in and its
 * battle log. Nothing here is secret any more. With `shown`, only that many
 * matches, in playing order, and no outcome: the board reveals them. With
 * `lines` too, the last shown match is still playing: only that many lines
 * of its log, open, the knockouts struck as the log reaches them, and no
 * winner yet.
 */
export function Bracket({
  rounds,
  wins,
  shown,
  lines,
}: {
  rounds: Match[][];
  wins: number;
  shown?: number;
  lines?: number;
}) {
  const firstOf = (round: number) =>
    rounds.slice(0, round).reduce((sum, matches) => sum + matches.length, 0);
  const visible = (round: number) =>
    rounds[round]!.slice(0, Math.max(0, (shown ?? Infinity) - firstOf(round)));
  return (
    <section className="flex flex-col gap-6">
      {shown === undefined && <Outcome wins={wins} rounds={rounds.length} />}
      {rounds.map(
        (_, round) =>
          visible(round).length > 0 && (
            <section
              key={round}
              aria-labelledby={`round-${round}`}
              className="flex flex-col gap-3"
            >
              <h2 id={`round-${round}`} className="text-xl font-bold">
                {ROUNDS[round]}
              </h2>
              <ol role="list" className="flex flex-col gap-3">
                {visible(round).map((match, index) => {
                  const n = firstOf(round) + index;
                  return (
                    <MatchCard
                      key={index}
                      match={match}
                      lines={n === (shown ?? 0) - 1 ? lines : undefined}
                    />
                  );
                })}
              </ol>
            </section>
          ),
      )}
    </section>
  );
}

function MatchCard({ match, lines }: { match: Match; lines?: number }) {
  const playing = lines !== undefined;
  const events = playing ? match.events.slice(0, lines) : match.events;
  // While it plays, a fighter is struck once the log says it fainted.
  const down = new Set(
    events.flatMap((e) =>
      e.kind === "hit" && e.fainted ? [`${1 - e.side}:${e.defender}`] : [],
    ),
  );
  const fainted = (side: number, name: string, after: boolean) =>
    playing ? down.has(`${side}:${name}`) : after;

  const log = (
    <ol role="list" className="mt-2 flex flex-col gap-1 text-sm tabular-nums">
      {events.map((event, i) => (
        <li key={i} className={playing ? "animate-pop" : undefined}>
          {said(event, match.teams)}
        </li>
      ))}
    </ol>
  );

  return (
    <li
      id={playing ? "playing" : undefined}
      className={`flex animate-pop flex-col gap-3 border bg-surface p-4 ${
        match.teams.some((team) => team.you)
          ? "border-foreground"
          : "border-muted"
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {match.teams.map((team, side) => {
          const won = !playing && match.winner === side;
          return (
            <div
              key={side}
              className={`flex flex-col gap-1 border p-2 ${
                won ? "border-foreground bg-background" : "border-transparent"
              }`}
            >
              <p
                className={`flex items-center gap-2 font-bold ${
                  !playing && !won ? "text-muted" : ""
                }`}
              >
                {won && <Trophy className="size-5 shrink-0" />}
                {team.name}
                {won && <span className="sr-only"> (winner)</span>}
              </p>
              <ol role="list" className="flex flex-wrap gap-x-3 text-sm">
                {team.members.map((member, i) => {
                  const out = fainted(side, member.name, member.fainted);
                  return (
                    <li
                      key={i}
                      className={out ? "text-muted line-through" : ""}
                    >
                      {member.name}
                      {out && <span className="sr-only"> (fainted)</span>}
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
      {!playing && match.decidedBy === "hp" && (
        <p className="text-sm text-muted">
          The fighters left could not hurt each other: won on the HP left.
        </p>
      )}
      {playing ? (
        // Read out line by line as the match plays.
        <div role="log" aria-label="Battle log">
          {log}
        </div>
      ) : (
        <details>
          <summary className="text-sm underline">
            Battle log ({match.events.filter((e) => e.kind === "hit").length}{" "}
            moves)
          </summary>
          {log}
        </details>
      )}
    </li>
  );
}
