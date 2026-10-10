"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  STATS,
  type Arrow,
  type Entry,
  type Progress,
  type Stat,
  type TypeMatch,
} from "@modules/guess/domain/guess";
import { Combobox } from "@shared/ui/Combobox";

type Game = Progress & { id: string };

const STAT_LABELS: Record<Stat, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

// Symbol shown, words spoken: feedback never rests on the symbol alone.
const ARROWS: Record<Arrow, [string, string]> = {
  higher: ["↑", "the answer's is higher"],
  lower: ["↓", "the answer's is lower"],
  equal: ["=", "equal"],
};
const MATCHES: Record<TypeMatch, [string, string]> = {
  exact: ["✓", "exact"],
  partial: ["~", "one shared"],
  none: ["✗", "none shared"],
};

function Feedback({ mark: [symbol, words] }: { mark: [string, string] }) {
  return (
    <>
      {" "}
      <span aria-hidden="true">{symbol}</span>
      <span className="sr-only">, {words}</span>
    </>
  );
}

const typesOf = (entry: Entry) => entry.types.join(" / ");

/*
 * The board holds only what the server sent: one row per guess with its
 * feedback. Each guess is a POST and the response replaces the whole game,
 * so the answer reaches this component only in the response that ends it.
 * The species names are the guess space, every one of them.
 *
 * A 409 means the page payload is behind the server (back and forward reuse
 * it, or a daily puzzle closed): refresh. The guess that ends the game
 * refreshes too, so the page can render `children`, what comes after it,
 * from the server: a new game, or the streak. Either way the board keeps
 * its place, and with it focus and message, and takes the server's game
 * unless it is itself further on.
 */
export function GuessBoard({
  initial,
  names,
  children,
}: {
  initial: Game;
  names: string[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const [game, setGame] = useState(initial);
  if (initial !== game && initial.rows.length >= game.rows.length) {
    setGame(initial);
  }
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const form = useRef<HTMLFormElement>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const played = useRef(false);

  const over = game.status !== "playing";
  const count = game.rows.length;

  // A guess remounts the input (its key is the count) to clear it, and the
  // one that ends the game removes it: either way, put the focus back.
  useEffect(() => {
    if (!played.current) return;
    if (over) result.current?.focus();
    else form.current?.querySelector("input")?.focus();
  }, [count, over]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const species = String(
      new FormData(event.currentTarget).get("species") ?? "",
    ).trim();
    if (pending || !species) return;
    played.current = true;
    setPending(true);
    setMessage(undefined);
    const response = await fetch(`/api/guess/games/${game.id}/guesses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ species }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    if (response?.ok && body) {
      const next = body as Game;
      setGame(next);
      const row = next.rows.at(-1);
      if (row) setMessage(`${row.name}: types ${MATCHES[row.typeMatch][1]}.`);
      if (next.status !== "playing") router.refresh();
    } else {
      setMessage(body?.error ?? "Could not reach the server. Try again.");
      if (response?.status === 409) router.refresh();
    }
    setPending(false);
  }

  return (
    <section className="flex flex-col gap-6 border border-muted bg-surface p-4">
      <p className="text-sm text-muted">
        Types: ✓ exact · ~ one shared · ✗ none. Stats: ↑ the answer&apos;s is
        higher · ↓ lower · = equal.
      </p>

      {(count > 0 || game.answer) && (
        <div
          role="region"
          aria-label="Guesses"
          tabIndex={0}
          className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">
              Your guesses, each compared with the answer
            </caption>
            <thead>
              <tr className="border-b border-muted">
                <th scope="col" className="py-1 pr-3">
                  Species
                </th>
                <th scope="col" className="py-1 pr-3">
                  Types
                </th>
                {STATS.map((stat) => (
                  <th key={stat} scope="col" className="py-1 pr-3">
                    {STAT_LABELS[stat]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {game.rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row" className="py-1 pr-3 whitespace-nowrap">
                    {row.name}
                  </th>
                  <td className="py-1 pr-3 whitespace-nowrap capitalize">
                    {typesOf(row)}
                    <Feedback mark={MATCHES[row.typeMatch]} />
                  </td>
                  {STATS.map((stat) => (
                    <td key={stat} className="py-1 pr-3 whitespace-nowrap">
                      {row.stats[stat]}
                      <Feedback mark={ARROWS[row.arrows[stat]]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {game.answer && (
              <tfoot>
                <tr className="border-t border-muted font-bold">
                  <th scope="row" className="py-1 pr-3 whitespace-nowrap">
                    <span className="sr-only">Answer: </span>
                    {game.answer.name}
                  </th>
                  <td className="py-1 pr-3 whitespace-nowrap capitalize">
                    {typesOf(game.answer)}
                  </td>
                  {STATS.map((stat) => (
                    <td key={stat} className="py-1 pr-3">
                      {game.answer?.stats[stat]}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <p
        ref={result}
        role="status"
        tabIndex={-1}
        className="font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {message && `${message} `}
        {game.status === "won" && `Got it: ${game.answer?.name}.`}
        {game.status === "lost" &&
          `${game.remaining > 0 ? "This puzzle has closed" : "Out of guesses"}. It was ${game.answer?.name}.`}
        {!over && `${game.remaining} guesses left.`}
      </p>

      {over ? (
        <div aria-live="polite">{children}</div>
      ) : (
        <form
          ref={form}
          onSubmit={submit}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="min-w-0 grow">
            <Combobox
              key={count}
              name="species"
              label="Species"
              options={names}
              placeholder="A species"
            />
          </div>
          <button
            type="submit"
            className="border border-foreground bg-foreground px-4 py-1 font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {pending ? "Checking…" : "Guess"}
          </button>
        </form>
      )}
    </section>
  );
}
