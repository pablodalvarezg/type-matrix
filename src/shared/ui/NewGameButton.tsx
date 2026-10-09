"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Starts a game of `mode` on the server and opens it. Every mode has
 * `/api/<mode>/games` and a page at `/<mode>/<id>`, except the daily one: it
 * sends the local date, and its page is the puzzle number.
 */
/** YYYY-MM-DD in the browser's time zone, whatever its locale. */
function localDate() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function NewGameButton({
  mode,
  label,
}: {
  mode: "hangman" | "guess" | "daily";
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function start() {
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/${mode}/games`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body:
        mode === "daily" ? JSON.stringify({ date: localDate() }) : undefined,
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    if (!response?.ok || !body) {
      setPending(false);
      setError(body?.error ?? "Could not start a game. Try again.");
      return;
    }
    const { id, puzzle } = body as { id: string; puzzle?: number };
    router.push(`/${mode}/${puzzle ?? id}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
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
