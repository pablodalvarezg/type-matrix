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
  HINTS_AT,
  kilos,
  metres,
  SCALES,
  type Arrow,
  type Entry,
  type Hints,
  type Initial,
  type Progress,
  type Row,
  type Scale,
} from "@modules/guess/domain/guess";
import { serverAhead } from "@shared/game";
import { describeShape } from "@shared/name-shape";
import { Combobox } from "@shared/ui/Combobox";

type Game = Progress & { id: string };

const LABELS: Record<Scale, string> = {
  generation: "Generation",
  stage: "Stage",
  height: "Height",
  weight: "Weight",
};

// Symbol shown, words spoken: feedback never rests on the symbol alone.
const ARROWS: Record<Arrow, [string, string]> = {
  higher: ["↑", "the answer's is higher"],
  lower: ["↓", "the answer's is lower"],
  equal: ["=", "equal"],
};
const HIT: [string, string] = ["✓", "the answer's"];
const MISS: [string, string] = ["✗", "not the answer's"];
const EXACT: [string, string] = ["=", "exactly its types"];

function Feedback({ mark: [symbol, words] }: { mark: [string, string] }) {
  return (
    <>
      {" "}
      <span aria-hidden="true">{symbol}</span>
      <span className="sr-only">, {words}</span>
    </>
  );
}

// Not CSS `capitalize`: from md the sr-only label before the value runs
// into it, and "Typesfighting" is one word.
const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** How each scale reads, given every generation's name. */
const formatOf = (
  generations: string[],
): Record<Scale, (n: number) => string> => ({
  generation: (n) => generations[n - 1]!,
  stage: String,
  height: metres,
  weight: kilos,
});

/** Each type of a guess with its own mark, and = when they are the answer's. */
function TypeHits({ row }: { row: Row }) {
  return (
    <>
      {row.types.map((type, index) => (
        <span key={type}>
          {index > 0 && " / "}
          {title(type)}
          <Feedback mark={row.typeHits[index] ? HIT : MISS} />
        </span>
      ))}
      {row.typeMatch === "exact" && <Feedback mark={EXACT} />}
    </>
  );
}

/** Everything a guess said, for the status line. */
function said(row: Row, format: Record<Scale, (n: number) => string>) {
  const types =
    row.typeMatch === "exact"
      ? "exactly the answer's types"
      : row.types
          .map((type, i) => `${type} ${row.typeHits[i] ? HIT[1] : MISS[1]}`)
          .join(", ");
  const color = `${row.color} ${row.colorHit ? HIT[1] : MISS[1]}`;
  const scales = SCALES.map(
    (scale) =>
      `${LABELS[scale].toLowerCase()} ${format[scale](row[scale])}, ${ARROWS[row.arrows[scale]][1]}`,
  );
  return `${row.name}: ${types}; ${color}; ${scales.join("; ")}.`;
}

/*
 * One markup for both layouts. Below md each guess is a card, every value
 * with its label. From md the cards line up as rows of one grid (subgrid),
 * the labels go to screen readers only and a header row shows them once.
 * Every level sets its column gap: a subgrid's own gap replaces its parent's.
 */
const GRID =
  "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_repeat(5,auto)]";
const ROW = "md:col-span-full md:grid md:grid-cols-subgrid md:gap-x-4";

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 md:block">
      <span className="w-24 shrink-0 text-muted md:sr-only">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function Card({
  entry,
  format,
  row,
  answer,
}: {
  entry: Entry;
  format: Record<Scale, (n: number) => string>;
  row?: Row;
  answer?: boolean;
}) {
  const scaleCell = (scale: Scale) => (
    <Cell key={scale} label={LABELS[scale]}>
      {format[scale](entry[scale])}
      {row && <Feedback mark={ARROWS[row.arrows[scale]]} />}
    </Cell>
  );
  return (
    <div
      className={`${ROW} flex animate-fade flex-col gap-1 border border-muted p-3 md:border-0 md:border-b md:px-0 md:py-1 ${answer ? "font-bold" : ""}`}
    >
      <span className="font-bold">
        {answer && "Answer: "}
        {entry.name}
      </span>
      <Cell label="Types">
        {row ? <TypeHits row={row} /> : entry.types.map(title).join(" / ")}
      </Cell>
      {SCALES.slice(0, 2).map(scaleCell)}
      <Cell label="Color">
        {title(entry.color)}
        {row && <Feedback mark={row.colorHit ? HIT : MISS} />}
      </Cell>
      {SCALES.slice(2).map(scaleCell)}
    </div>
  );
}

/** "starts with M · 2 + 4 letters, with a space" */
const shapeOf = (initial: Initial) =>
  `starts with ${initial.letter} · ${describeShape(initial)}`;

/** What the misses unlocked, and when the rest unlock. */
function HintList({
  hints,
  format,
}: {
  hints: Hints;
  format: Record<Scale, (n: number) => string>;
}) {
  const locked = (at: number) => (
    <span className="text-muted">after {at} misses</span>
  );
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted">Generation</dt>
      <dd className="animate-pop" key={hints.generation}>
        {hints.generation
          ? format.generation(hints.generation)
          : locked(HINTS_AT.generation)}
      </dd>
      <dt className="text-muted">Types</dt>
      <dd className="animate-pop" key={String(hints.types)}>
        {hints.types
          ? hints.types.map(title).join(" / ")
          : locked(HINTS_AT.types)}
      </dd>
      <dt className="text-muted">Name</dt>
      <dd className="animate-pop" key={hints.initial?.letter}>
        {hints.initial ? shapeOf(hints.initial) : locked(HINTS_AT.initial)}
      </dd>
    </dl>
  );
}

const hintCount = (hints: Hints) => Object.keys(hints).length;

/*
 * The board holds only what the server sent: one card per guess with its
 * feedback, and the hints the misses unlocked. Each guess is a POST and the
 * response replaces the whole game, so the answer reaches this component
 * only in the response that ends it, or in the one that gives it up.
 * The species names are the guess space, every one of them.
 *
 * A 409 means the page payload is behind the server (back and forward reuse
 * it, or a daily puzzle closed): refresh. The guess that ends the game
 * refreshes too, so the page can render `children`, what comes after it,
 * from the server: a new game, or the streak. Either way the board keeps
 * its place, and with it focus and message, and takes the server's game
 * only when it is further on.
 */
export function GuessBoard({
  initial,
  names,
  generations,
  children,
}: {
  initial: Game;
  names: string[];
  /** Every generation's name, Gen I first. */
  generations: string[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const [game, setGame] = useState(initial);
  const at = (g: Game) => ({
    moves: g.rows.length,
    playing: g.status === "playing",
  });
  if (initial !== game && serverAhead(at(initial), at(game))) setGame(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<ReactNode>();
  const form = useRef<HTMLFormElement>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const played = useRef(false);
  const format = formatOf(generations);

  const over = game.status !== "playing";
  const count = game.rows.length;

  // A guess remounts the input (its key is the count) to clear it, and the
  // one that ends the game removes it: either way, put the focus back.
  useEffect(() => {
    if (!played.current) return;
    if (over) result.current?.focus();
    else form.current?.querySelector("input")?.focus();
  }, [count, over]);

  /** POSTs to the game, then takes the response as the game. */
  async function send(
    path: string,
    body: object,
    toSay: (next: Game) => ReactNode,
  ) {
    played.current = true;
    setPending(true);
    setMessage(undefined);
    const response = await fetch(`/api/guess/games/${game.id}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok && data) {
      const next = data as Game;
      setGame(next);
      setMessage(toSay(next));
      if (next.status !== "playing") router.refresh();
    } else {
      setMessage(data?.error ?? "Could not reach the server. Try again.");
      if (response?.status === 409) router.refresh();
    }
    setPending(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const species = String(
      new FormData(event.currentTarget).get("species") ?? "",
    ).trim();
    if (pending || !species) return;
    void send("guesses", { species }, (next) => {
      const row = next.rows.at(-1);
      if (!row) return "";
      const unlocked =
        next.status === "playing" &&
        hintCount(next.hints) > hintCount(game.hints);
      // The card already shows it all: the full sentence is for screen readers.
      return (
        <>
          <span aria-hidden="true">{row.name}.</span>
          <span className="sr-only">{said(row, format)}</span>
          {unlocked && " New hint."}
        </>
      );
    });
  }

  function giveUp() {
    if (pending || !window.confirm("Give up and see the answer?")) return;
    void send("give-up", {}, () => "");
  }

  const ending =
    game.stopped === "gave-up"
      ? "You gave up"
      : game.stopped === "closed"
        ? "This puzzle has closed"
        : "Out of guesses";

  return (
    <section className="flex flex-col gap-6 border border-muted bg-surface p-4">
      <p className="text-sm text-muted">
        Types and color: ✓ the answer&apos;s · ✗ not · = exactly its types.
        Generation, stage, height and weight: ↑ the answer&apos;s is higher · ↓
        lower · = equal.
      </p>

      <section aria-labelledby="hints" className="flex flex-col gap-2">
        <h2 id="hints" className="font-bold">
          Hints
        </h2>
        <HintList hints={game.hints} format={format} />
      </section>

      {(count > 0 || game.answer) && (
        <div
          className={`relative flex flex-col gap-2 text-sm tabular-nums ${GRID}`}
        >
          <div
            aria-hidden="true"
            className={`hidden border-b border-muted py-1 font-bold ${ROW}`}
          >
            <span>Species</span>
            <span>Types</span>
            <span>{LABELS.generation}</span>
            <span>{LABELS.stage}</span>
            <span>Color</span>
            <span>{LABELS.height}</span>
            <span>{LABELS.weight}</span>
          </div>
          <ol
            role="list"
            aria-label="Your guesses"
            className={`flex flex-col gap-2 md:gap-y-0 ${ROW}`}
          >
            {game.rows.map((row) => (
              <li key={row.name} className={ROW}>
                <Card entry={row} row={row} format={format} />
              </li>
            ))}
          </ol>
          {game.answer && <Card entry={game.answer} format={format} answer />}
        </div>
      )}

      <p
        ref={result}
        role="status"
        tabIndex={-1}
        className="font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {message && <>{message} </>}
        {game.status === "won" && `Got it: ${game.answer?.name}.`}
        {game.status === "lost" && `${ending}. It was ${game.answer?.name}.`}
        {!over &&
          `${game.remaining} ${game.remaining === 1 ? "guess" : "guesses"} left.`}
      </p>

      {over ? (
        <div aria-live="polite" className="animate-pop">
          {children}
        </div>
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
            // aria-disabled, not disabled, like the hangman letters: it keeps
            // the focus, and `submit` already ignores a click while pending.
            aria-disabled={pending}
            className="border border-foreground bg-foreground px-4 py-1 font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {pending ? "Checking…" : "Guess"}
          </button>
          <button
            type="button"
            onClick={giveUp}
            aria-disabled={pending}
            className="border border-muted px-3 py-1 text-sm text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Give up
          </button>
        </form>
      )}
    </section>
  );
}
