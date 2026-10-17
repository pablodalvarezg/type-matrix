/*
 * How a played bracket is revealed (decided by Pablo on 2026-10-17): the
 * rivals' matches appear whole, one per step. The player's match waits, its
 * teams on screen and its log empty, for "Begin combat", then plays a log
 * line per step.
 */

/** Every step waits this long, whatever it shows. */
export const STEP_MS = 500;

export interface RevealMatch {
  yours: boolean;
  /** Lines in its log. */
  events: number;
}

export interface Step {
  /** Matches on screen, in playing order. */
  shown: number;
  /** Set while the last of them plays: its log lines on screen. */
  lines?: number;
  /** Waits for the player instead of the clock. */
  pause?: true;
}

export function revealSteps(rounds: RevealMatch[][]): Step[] {
  const steps: Step[] = [];
  let shown = 0;
  for (const match of rounds.flat()) {
    shown++;
    if (match.yours) {
      steps.push({ shown, lines: 0, pause: true });
      for (let lines = 1; lines <= match.events; lines++) {
        steps.push({ shown, lines });
      }
    }
    steps.push({ shown });
  }
  return steps;
}

/** Where "Skip" lands: the player's next match, or past the end. */
export const skipFrom = (steps: Step[], at: number) => {
  const pause = steps.findIndex((step, i) => i > at && step.pause);
  return pause === -1 ? steps.length : pause;
};
