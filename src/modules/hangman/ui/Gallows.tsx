import { MAX_WRONG } from "@modules/hangman/domain/hangman";

// pathLength 1 makes the dash pattern one full stroke, so animate-draw can
// pull it in from its end whatever the shape's real length.
const draw = { pathLength: 1, className: "animate-draw [stroke-dasharray:1]" };

// One part per miss, in drawing order.
const PARTS = [
  <circle key="head" cx="65" cy="33" r="8" {...draw} />,
  <path key="body" d="M65 41 V75" {...draw} />,
  <path key="left-arm" d="M65 50 L52 62" {...draw} />,
  <path key="right-arm" d="M65 50 L78 62" {...draw} />,
  <path key="left-leg" d="M65 75 L54 95" {...draw} />,
  <path key="right-leg" d="M65 75 L76 95" {...draw} />,
];
if (PARTS.length !== MAX_WRONG) {
  throw new Error(`The gallows draws ${PARTS.length} parts, not ${MAX_WRONG}`);
}

/**
 * The gallows, and one more part of the figure per miss. Each part mounts
 * when its miss lands, so only the new one draws itself in. Decoration: the
 * board already says the misses in words.
 */
export function Gallows({ misses }: { misses: number }) {
  return (
    <svg
      viewBox="0 0 90 120"
      aria-hidden="true"
      className="w-20 shrink-0 fill-none stroke-[3] [stroke-linecap:square]"
    >
      <path d="M10 115 H70 M25 115 V10 H65 V25" className="stroke-muted" />
      <g className="stroke-foreground">{PARTS.slice(0, misses)}</g>
    </svg>
  );
}
