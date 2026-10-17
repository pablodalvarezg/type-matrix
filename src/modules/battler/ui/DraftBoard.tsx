"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { TEAM_SIZE } from "@modules/battler/domain/draft";
import type { Match } from "@modules/battler/ui/Bracket";
import { BracketReveal } from "@modules/battler/ui/BracketReveal";
import { SpeciesCard, type Card } from "@modules/battler/ui/SpeciesCard";

interface Draft {
  id: string;
  difficulty: string;
  stage: "draft" | "order" | "bracket";
  picks: Card[];
  offers: Card[];
  rerollsLeft: number;
  /** Once the team is ordered. */
  rounds?: Match[][];
  wins?: number;
}

/*
 * The board holds only what the server sent: this pick's offers, never the
 * ones to come. Each pick, reroll or order is a POST, and the response
 * replaces the draft; a 409 means the page payload is behind the server, so
 * it refreshes. After each response the stage heading takes the focus: the
 * button pressed is gone with the offers it was one of. The page keys the
 * board by its progress, so a refresh that is further on mounts it again.
 *
 * The response that orders the team carries the bracket, no longer secret,
 * and BracketReveal plays it out; the page shows a finished run whole.
 */
export function DraftBoard({ initial }: { initial: Draft }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [order, setOrder] = useState(initial.picks);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const heading = useRef<HTMLHeadingElement>(null);
  const [landed, setLanded] = useState(0);

  useEffect(() => {
    if (landed) heading.current?.focus();
  }, [landed]);

  async function send(path: string, body: object, said: string) {
    if (pending) return;
    setPending(true);
    setMessage(undefined);
    const response = await fetch(`/api/battler/games/${draft.id}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok && data) {
      const next = data as Draft;
      setDraft(next);
      setOrder(next.picks);
      // A new stage gets a new heading; the last pick's message would be stale.
      setMessage(next.stage === draft.stage ? said : undefined);
      if (next.stage !== "bracket") setLanded((n) => n + 1);
    } else {
      setMessage(data?.error ?? "Could not reach the server. Try again.");
      if (response?.status === 409) router.refresh();
    }
    setPending(false);
  }

  const move = (from: number, to: number) => {
    const next = [...order];
    next.splice(to, 0, ...next.splice(from, 1));
    setOrder(next);
    setMessage(`${next[to]!.name} is now number ${to + 1}.`);
  };

  if (draft.rounds) {
    return (
      <BracketReveal
        rounds={draft.rounds}
        wins={draft.wins!}
        difficulty={draft.difficulty}
      />
    );
  }

  return (
    <section className="flex flex-col gap-6 border border-muted bg-surface p-4">
      {draft.stage === "draft" ? (
        <>
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground tabular-nums"
          >
            Pick {draft.picks.length + 1} of {TEAM_SIZE}
          </h2>
          <ul role="list" className="grid gap-2 sm:grid-cols-2">
            {draft.offers.map((offer) => (
              <li key={offer.slug} className="flex">
                <button
                  type="button"
                  onClick={() =>
                    send(
                      "picks",
                      { species: offer.slug },
                      `${offer.name} joins your team.`,
                    )
                  }
                  aria-disabled={pending}
                  className="flex-1 border border-foreground p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <SpeciesCard species={offer} />
                </button>
              </li>
            ))}
          </ul>
          {draft.rerollsLeft > 0 ? (
            <button
              type="button"
              onClick={() => send("rerolls", {}, "New offers.")}
              aria-disabled={pending}
              className="self-start border border-muted px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Reroll the offers ({draft.rerollsLeft} left)
            </button>
          ) : (
            <p className="text-sm text-muted">No rerolls left.</p>
          )}
        </>
      ) : (
        <>
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Order your team
          </h2>
          <p className="text-sm text-muted">
            The first one leads; when one faints, the next comes in.
          </p>
        </>
      )}

      <p role="status" className="font-bold">
        {message}
      </p>

      {draft.picks.length > 0 && (
        <div className="flex flex-col gap-2">
          {draft.stage === "draft" && <h3 className="font-bold">Your team</h3>}
          <ol role="list" className="flex flex-col gap-2">
            {(draft.stage === "draft" ? draft.picks : order).map(
              (member, index) => (
                <li
                  key={member.slug}
                  className="flex items-center gap-3 border border-muted bg-background p-3"
                >
                  <span className="font-bold tabular-nums">{index + 1}.</span>
                  <SpeciesCard species={member} />
                  {draft.stage === "order" && (
                    <span className="ml-auto flex gap-1">
                      <OrderButton
                        label={`Move ${member.name} up`}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        ↑
                      </OrderButton>
                      <OrderButton
                        label={`Move ${member.name} down`}
                        disabled={index === order.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        ↓
                      </OrderButton>
                    </span>
                  )}
                </li>
              ),
            )}
          </ol>
        </div>
      )}

      {draft.stage === "order" && (
        <button
          type="button"
          onClick={() =>
            send(
              "order",
              { order: order.map((member) => member.slug) },
              "To the bracket.",
            )
          }
          aria-disabled={pending}
          className="self-start border border-foreground bg-foreground px-4 py-2 font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {pending ? "Playing…" : "Start the tournament"}
        </button>
      )}
    </section>
  );
}

function OrderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      // aria-disabled, not disabled: moving the last one up would otherwise
      // drop the focus of whoever pressed it with the keyboard.
      aria-disabled={disabled}
      onClick={() => !disabled && onClick()}
      className="border border-foreground px-2 font-bold aria-disabled:border-muted aria-disabled:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {children}
    </button>
  );
}
