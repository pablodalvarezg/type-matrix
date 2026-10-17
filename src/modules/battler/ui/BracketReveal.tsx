import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { revealSteps, skipFrom, STEP_MS } from "@modules/battler/domain/reveal";
import { Bracket, Outcome, type Match } from "@modules/battler/ui/Bracket";
import { NewGameButton } from "@shared/ui/NewGameButton";

/*
 * Rendered only by DraftBoard, so on the client without a directive of its
 * own. A step every STEP_MS, except before each of the player's matches,
 * which waits for "Begin combat". The one button turns between that and
 * "Skip" in place, so the focus stays on it. It floats at the bottom of the
 * screen, so the lines that keep coming do not push it down; it is a portal
 * to <body>, since the entry animation of `main > *` transforms the block,
 * and a transformed ancestor would pin `fixed` to it instead of the screen.
 * The outcome takes the focus once everything is on screen.
 */
export function BracketReveal({
  rounds,
  wins,
  difficulty,
}: {
  rounds: Match[][];
  wins: number;
  difficulty: string;
}) {
  const steps = useMemo(
    () =>
      revealSteps(
        rounds.map((matches) =>
          matches.map((match) => ({
            yours: match.teams.some((team) => team.you),
            events: match.events.length,
          })),
        ),
      ),
    [rounds],
  );
  const [at, setAt] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const done = at >= steps.length;
  const step = steps[Math.min(at, steps.length - 1)]!;

  // The button that started the tournament is gone: this one takes over.
  useEffect(() => {
    button.current?.focus();
  }, []);
  useEffect(() => {
    if (done) {
      document.getElementById("outcome")?.focus();
      return;
    }
    if (step.pause) {
      // The player's match may be below the fold: bring it into view.
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("playing")?.scrollIntoView({
        block: "center",
        behavior: reduce ? "auto" : "smooth",
      });
      return;
    }
    const timer = setTimeout(() => setAt((n) => n + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [at, done, step]);

  return (
    // Room at the bottom for the floating button, so it never covers the
    // last line.
    <div className={`flex flex-col gap-6 ${done ? "" : "pb-24"}`}>
      <Bracket
        rounds={rounds}
        wins={wins}
        shown={step.shown}
        lines={step.lines}
      />
      {done ? (
        <>
          <Outcome wins={wins} rounds={rounds.length} />
          <NewGameButton
            mode="battler"
            body={{ difficulty }}
            label="Play again"
          />
        </>
      ) : (
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing)*4_+_env(safe-area-inset-bottom))] z-10">
            <div className="mx-auto max-w-2xl px-4">
              <button
                ref={button}
                type="button"
                onClick={() => setAt(step.pause ? at + 1 : skipFrom(steps, at))}
                className="pointer-events-auto border border-foreground bg-foreground px-4 py-2 font-bold text-background shadow-pixel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                {step.pause ? "Begin combat" : "Skip"}
              </button>
            </div>
          </div>,
          document.body,
        )
      )}
    </div>
  );
}
