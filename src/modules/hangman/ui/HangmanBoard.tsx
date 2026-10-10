"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { Progress } from "@modules/hangman/domain/hangman";
import { Gallows } from "@modules/hangman/ui/Gallows";

type Game = Progress & { id: string };

const ALPHABET = [..."abcdefghijklmnopqrstuvwxyz"];

/*
 * The board holds only what the server sent: the mask, the letters tried and
 * the count. Each key is a POST, and the response replaces the whole game, so
 * the answer reaches this component only in the response that ends it, or
 * in the one that gives it up.
 *
 * A 409 means the page payload is behind the server (back and forward reuse
 * it, or a daily puzzle closed): refresh. The response that ends the game
 * refreshes too, so the page can render `children`, what comes after it,
 * from the server: a new game, or the streak and the leaderboard. The board
 * keeps its place, and takes the server's game only when it is further on.
 */
export function HangmanBoard({
  initial,
  children,
}: {
  initial: Game;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [game, setGame] = useState(initial);
  const tried = (g: Game) => g.guessed.length;
  const serverAhead =
    tried(initial) > tried(game) ||
    (tried(initial) === tried(game) &&
      initial.status !== "playing" &&
      game.status === "playing");
  if (initial !== game && serverAhead) setGame(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const result = useRef<HTMLParagraphElement>(null);
  const played = useRef(false);

  const over = game.status !== "playing";

  // The response that ends the game removes the key that had focus.
  useEffect(() => {
    if (over && played.current) result.current?.focus();
  }, [over]);

  /** POSTs to the game, then takes the response as the game. */
  async function send(
    path: string,
    body: object,
    said: (next: Game) => string,
  ) {
    played.current = true;
    setPending(true);
    setMessage(undefined);
    const response = await fetch(`/api/hangman/games/${game.id}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok && data) {
      const next = data as Game;
      setGame(next);
      setMessage(said(next));
      if (next.status !== "playing") router.refresh();
    } else {
      setMessage(data?.error ?? "Could not reach the server. Try again.");
      if (response?.status === 409) router.refresh();
    }
    setPending(false);
  }

  function guess(letter: string) {
    if (pending || game.guessed.includes(letter)) return;
    const shown = letter.toUpperCase();
    void send("guesses", { letter }, (next) =>
      next.wrong.includes(letter)
        ? `${shown} is not in the name.`
        : `${shown} is in the name.`,
    );
  }

  function giveUp() {
    if (pending || !window.confirm("Give up and see the answer?")) return;
    void send("give-up", {}, () => "");
  }

  const spoken = game.mask.map((char) => char ?? "blank").join(" ");
  const ending =
    game.stopped === "gave-up"
      ? "You gave up"
      : game.stopped === "closed"
        ? "This puzzle has closed"
        : "Out of misses";

  return (
    <section className="flex flex-col gap-6 border border-muted bg-surface p-4">
      <p className="text-3xl font-bold break-all whitespace-pre-wrap tracking-widest">
        <span aria-hidden="true">
          {/* Keyed by what it shows, so a revealed letter mounts and pops in. */}
          {game.mask.map((char, index) => (
            <span
              key={`${index}:${char ?? "_"}`}
              className={char?.trim() ? "inline-block animate-pop" : undefined}
            >
              {char ?? "_"}
            </span>
          ))}
        </span>
        <span className="sr-only">The name: {spoken}</span>
      </p>

      <div className="flex items-center gap-4">
        <Gallows misses={game.wrong.length} />
        <p className="tabular-nums">
          Misses ({game.wrong.length}):{" "}
          {game.wrong.length ? game.wrong.join(" ").toUpperCase() : "none"}
        </p>
      </div>

      <p
        ref={result}
        role="status"
        tabIndex={-1}
        className="font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {message && `${message} `}
        {game.status === "won" && `Got it: ${game.answer}.`}
        {game.status === "lost" && `${ending}. It was ${game.answer}.`}
        {!over && `${game.remaining} misses left.`}
      </p>

      {over ? (
        <div aria-live="polite" className="animate-pop">
          {children}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-9">
            {ALPHABET.map((letter) => {
              const done = game.guessed.includes(letter);
              const miss = game.wrong.includes(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => guess(letter)}
                  // aria-disabled, not disabled: a disabled button drops the
                  // focus of whoever just pressed it with the keyboard.
                  aria-disabled={done}
                  aria-label={
                    done ? `${letter}, ${miss ? "miss" : "hit"}` : letter
                  }
                  className={`border px-2 py-2 font-bold uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                    done
                      ? `border-muted bg-background text-muted ${miss ? "line-through" : ""}`
                      : "border-foreground bg-foreground text-background"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={giveUp}
            aria-disabled={pending}
            className="self-start border border-muted px-3 py-1 text-sm text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Give up
          </button>
        </>
      )}
    </section>
  );
}
