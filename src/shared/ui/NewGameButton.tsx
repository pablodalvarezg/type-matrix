"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Starts a game of `mode` on the server and opens it. The game id is all it
 * gets back. Every mode has `/api/<mode>/games` and a page at `/<mode>/<id>`.
 */
export function NewGameButton({
  mode,
  label,
}: {
  mode: "hangman" | "guess";
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function start() {
    setPending(true);
    setFailed(false);
    const response = await fetch(`/api/${mode}/games`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    }).catch(() => null);
    const game = response?.ok && (await response.json().catch(() => null));
    if (!game) {
      setPending(false);
      setFailed(true);
      return;
    }
    router.push(`/${mode}/${(game as { id: string }).id}`);
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
        {failed && "Could not start a game. Try again."}
      </p>
    </div>
  );
}
