// Apart from daily.ts, which needs node:crypto: the countdown runs in the
// browser, where the player's midnight is.

/** Milliseconds from `now` to the next local midnight, when the date turns. */
export function untilMidnight(now: Date): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/** A time to show: m:ss, or h:mm:ss from an hour on. Seconds floor. */
export function duration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const [h, m, s] = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
