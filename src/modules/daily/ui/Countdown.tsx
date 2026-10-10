"use client";

import { useEffect, useState } from "react";

import { duration, untilMidnight } from "@modules/daily/domain/time";

/**
 * Time left until the player's date turns and a new puzzle opens. Only the
 * browser knows its midnight, so the server renders nothing here and the
 * first tick fills it in: no hydration mismatch.
 */
export function Countdown() {
  const [left, setLeft] = useState<number>();

  useEffect(() => {
    const tick = () => setLeft(untilMidnight(new Date()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-sm text-muted tabular-nums">
      {left !== undefined && <>Next puzzle in {duration(left)}</>}
    </span>
  );
}
