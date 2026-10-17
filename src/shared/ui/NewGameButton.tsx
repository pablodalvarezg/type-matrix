"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** YYYY-MM-DD in the browser's time zone, whatever its locale. */
function localDate() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The checked radios and checkboxes around the button, each name as a list:
 * checkboxes repeat one.
 */
function optionsOf(button: HTMLElement) {
  const fields: Record<string, string[]> = {};
  const scope = button.closest("[data-game-options]");
  for (const input of scope?.querySelectorAll<HTMLInputElement>(
    "input:checked",
  ) ?? []) {
    (fields[input.name] ??= []).push(input.value);
  }
  return fields;
}

/**
 * Starts a game of `mode` on the server and opens it: `/api/<mode>/games`,
 * then `/<mode>/<id>`. The body is `body` plus what is checked in the
 * `[data-game-options]` element the button sits in, if any: native radios
 * and checkboxes choose the game, with no other client component. A `daily`
 * one goes to `/api/daily/games` with the local date, and its page is
 * `/daily/<mode>/<puzzle>`. Either endpoint hands back the game already
 * open, if there is one.
 */
export function NewGameButton({
  mode,
  daily = false,
  body,
  label,
}: {
  mode: "hangman" | "guess" | "battler";
  daily?: boolean;
  body?: Record<string, unknown>;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function start(button: HTMLElement) {
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/${daily ? "daily" : mode}/games`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        daily ? { date: localDate(), mode } : { ...optionsOf(button), ...body },
      ),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (!response?.ok || !data) {
      setPending(false);
      setError(data?.error ?? "Could not start a game. Try again.");
      return;
    }
    const { id, puzzle } = data as { id: string; puzzle?: number };
    router.push(daily ? `/daily/${mode}/${puzzle}` : `/${mode}/${id}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={(event) => start(event.currentTarget)}
        disabled={pending}
        className="self-start border border-foreground bg-foreground px-4 py-2 font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {pending ? "Starting…" : label}
      </button>
      <p role="status" className="text-sm">
        {error}
      </p>
    </div>
  );
}
