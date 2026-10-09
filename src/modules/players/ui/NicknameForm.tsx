"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * Saves the player's nickname, then refreshes the page so the server renders
 * what it unlocks, such as their row on a leaderboard. The refresh removes
 * the form, so the focus moves first to `focusOnSave`, an element that stays.
 * The pattern mirrors the server's, which still has the last word.
 */
export function NicknameForm({
  prompt,
  focusOnSave,
}: {
  prompt: string;
  focusOnSave: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nickname = new FormData(event.currentTarget).get("nickname");
    setPending(true);
    setError(undefined);
    const response = await fetch("/api/players/nickname", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setPending(false);
    if (!response?.ok) {
      setError(body?.error ?? "Could not reach the server. Try again.");
      return;
    }
    document.getElementById(focusOnSave)?.focus();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="flex min-w-0 grow flex-col gap-1">
        <label htmlFor="nickname" className="text-sm text-muted">
          {prompt}
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          autoComplete="nickname"
          required
          pattern="[A-Za-z0-9_\-]{3,16}"
          title="3 to 16 characters: letters, digits, _ or -"
          aria-invalid={error ? true : undefined}
          aria-describedby="nickname-error"
          className="border border-muted bg-background px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="border border-foreground bg-foreground px-4 py-1 font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <p id="nickname-error" role="status" className="w-full text-sm">
        {error}
      </p>
    </form>
  );
}
