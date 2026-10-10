import Link from "next/link";

/**
 * Back to the game the player has open, where a mode's page would offer a
 * new one: one game at a time, and giving up is what ends it early.
 */
export function ContinueLink({ href }: { href: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={href}
        className="self-start border border-foreground bg-foreground px-4 py-2 font-bold text-background no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Continue your game
      </Link>
      <p className="text-sm text-muted">
        To start another, finish it or give up.
      </p>
    </div>
  );
}
