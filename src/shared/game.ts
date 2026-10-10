/*
 * Rules every game mode shares, written once so the modes cannot drift
 * apart. Pure: the services and the client boards both use them.
 */

/** What ends a game early, as each mode's domain calls it. */
export type Stop = "closed" | "gave-up";

/**
 * Why a stored game is stopped, if it is: the player gave up, or its daily
 * puzzle is no longer today anywhere.
 */
export function stopOf(
  { givenUp, closesAt }: { givenUp: boolean; closesAt: Date | null },
  now = new Date(),
): Stop | undefined {
  if (givenUp) return "gave-up";
  return closesAt !== null && closesAt <= now ? "closed" : undefined;
}

/** A game as a board compares it: how many moves, and whether it still plays. */
interface Snapshot {
  moves: number;
  playing: boolean;
}

/**
 * Whether the server's copy of a game is further on than the board's: more
 * moves, or as many and over while the board still plays (given up in
 * another tab). Never otherwise, or the stale payload a board started from
 * would undo its own give-up.
 */
export function serverAhead(server: Snapshot, board: Snapshot): boolean {
  return (
    server.moves > board.moves ||
    (server.moves === board.moves && !server.playing && board.playing)
  );
}
