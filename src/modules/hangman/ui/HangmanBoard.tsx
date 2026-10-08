"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Progress } from "@modules/hangman/domain/hangman";
import { NewGameButton } from "@modules/hangman/ui/NewGameButton";

type Game = Progress & { id: string };

const ALPHABET = [..."abcdefghijklmnopqrstuvwxyz"];

/*
 * The board holds only what the server sent: the mask, the letters tried and
 * the count. Each key is a POST, and the response replaces the whole game, so
 * the answer reaches this component only in the response that ends it.
 *
 * Back/forward reuses the page's first payload, so the board can open behind
 * the server. A 409 means exactly that: refresh, and the page remounts the
 * board (its key carries the letters) with the game as it is.
 */
export function HangmanBoard({ initial }: { initial: Game }) {
  const router = useRouter();
  const [game, setGame] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const result = useRef<HTMLParagraphElement>(null);
  const played = useRef(false);

  const over = game.status !== "playing";

  // The guess that ends the game removes the key that had focus.
  useEffect(() => {
    if (over && played.current) result.current?.focus();
  }, [over]);

  async function guess(letter: string) {
    if (pending || game.guessed.includes(letter)) return;
    played.current = true;
    setPending(true);
    setMessage(undefined);
    const response = await fetch(`/api/hangman/games/${game.id}/guesses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ letter }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    const shown = letter.toUpperCase();
    if (response?.ok && body) {
      const next = body as Game;
      setGame(next);
      setMessage(
        next.wrong.includes(letter)
          ? `${shown} is not in the name.`
          : `${shown} is in the name.`,
      );
    } else {
      setMessage(body?.error ?? "Could not reach the server. Try again.");
      if (response?.status === 409) router.refresh();
    }
    setPending(false);
  }

  const spoken = game.mask.map((char) => char ?? "blank").join(" ");

  return (
    <section className="flex flex-col gap-6 border border-muted bg-surface p-4">
      <p className="text-3xl font-bold break-all whitespace-pre-wrap tracking-widest">
        <span aria-hidden="true">
          {game.mask.map((char) => char ?? "_").join("")}
        </span>
        <span className="sr-only">The name: {spoken}</span>
      </p>

      <p className="tabular-nums">
        Misses ({game.wrong.length}):{" "}
        {game.wrong.length ? game.wrong.join(" ").toUpperCase() : "none"}
      </p>

      <p
        ref={result}
        role="status"
        tabIndex={-1}
        className="font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {message && `${message} `}
        {game.status === "won" && `Got it: ${game.answer}.`}
        {game.status === "lost" && `Out of misses. It was ${game.answer}.`}
        {!over && `${game.remaining} misses left.`}
      </p>

      {over ? (
        <NewGameButton label="Play again" />
      ) : (
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-9">
          {ALPHABET.map((letter) => {
            const tried = game.guessed.includes(letter);
            const miss = game.wrong.includes(letter);
            return (
              <button
                key={letter}
                type="button"
                onClick={() => guess(letter)}
                // aria-disabled, not disabled: a disabled button drops the
                // focus of whoever just pressed it with the keyboard.
                aria-disabled={tried}
                aria-label={
                  tried ? `${letter}, ${miss ? "miss" : "hit"}` : letter
                }
                className={`border px-2 py-2 font-bold uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  tried
                    ? `border-muted bg-background text-muted ${miss ? "line-through" : ""}`
                    : "border-foreground bg-foreground text-background"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
