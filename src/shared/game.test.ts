import { describe, expect, it } from "vitest";

import { serverAhead, stopOf } from "@shared/game";

const NOW = new Date("2026-10-09T12:00:00Z");

describe("stopOf", () => {
  it("is nothing for an open free-play game", () => {
    expect(stopOf({ givenUp: false, closesAt: null }, NOW)).toBeUndefined();
  });

  it("closes a daily game at its closing time, not before", () => {
    const at = (iso: string) => ({ givenUp: false, closesAt: new Date(iso) });
    expect(stopOf(at("2026-10-09T12:00:01Z"), NOW)).toBeUndefined();
    expect(stopOf(at("2026-10-09T12:00:00Z"), NOW)).toBe("closed");
  });

  it("says gave up over closed: the player's act came first", () => {
    const game = { givenUp: true, closesAt: new Date("2026-10-01T00:00:00Z") };
    expect(stopOf(game, NOW)).toBe("gave-up");
  });
});

describe("serverAhead", () => {
  const at = (moves: number, playing = true) => ({ moves, playing });

  it("takes a server copy with more moves", () => {
    expect(serverAhead(at(3), at(2))).toBe(true);
  });

  it("takes one with as many moves that is over while the board plays", () => {
    expect(serverAhead(at(2, false), at(2))).toBe(true);
  });

  it.each([
    ["the stale payload behind a give-up", at(2), at(2, false)],
    ["a payload with fewer moves", at(1), at(2)],
    ["the same game", at(2), at(2)],
    ["the same game over", at(2, false), at(2, false)],
  ])("ignores %s", (_, server, board) => {
    expect(serverAhead(server, board)).toBe(false);
  });
});
