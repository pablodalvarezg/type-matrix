import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as dailyRoute } from "@app/api/daily/games/route";
import { POST as guessRoute } from "@app/api/guess/games/route";
import { POST as hangmanRoute } from "@app/api/hangman/games/route";
import { POST as nicknameRoute } from "@app/api/players/nickname/route";
import { signPlayerId } from "@modules/players/domain/player-cookie";

/*
 * The four routes that add rows, wired to the throttle: over the cap they
 * answer 429 before saving anything, and without issuing the cookie.
 */

const jar = vi.hoisted(() => new Map<string, string>());
const over = vi.hoisted(() => ({ hit: vi.fn(async () => 1_000) }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: ({ name, value }: { name: string; value: string }) =>
      jar.set(name, value),
  }),
}));
vi.mock("@shared/config/env", () => ({
  env: {
    COOKIE_SECRET: "c".repeat(32),
    DAILY_SECRET: "d".repeat(32),
    LAUNCH_DATE: "2026-01-01",
    NODE_ENV: "test",
  },
}));
vi.mock("@shared/db/client", () => ({ sql: vi.fn() }));
vi.mock("@shared/db/rate-limit", () => over);
vi.mock("@modules/daily", async (original) => ({
  ...(await original<typeof import("@modules/daily")>()),
  startDaily: async () => ({ id: "game", puzzle: 1 }),
}));

const post = (body?: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe("routes over the cap", () => {
  beforeEach(() => {
    jar.clear();
    over.hit.mockClear();
  });

  it.each([
    ["nickname", () => nicknameRoute(post({ nickname: "ash_1" }))],
    ["hangman", () => hangmanRoute(post())],
    ["guess", () => guessRoute(post())],
    ["daily", () => dailyRoute(post({ date: "2026-10-09", mode: "guess" }))],
  ])("%s answers 429 and issues no cookie", async (_, call) => {
    expect((await call()).status).toBe(429);
    expect(over.hit).toHaveBeenCalledOnce();
    expect(jar.size).toBe(0);
  });

  it("daily lets a known player back to their game", async () => {
    const id = "3f2b8c1e-5d4a-4e6f-9b7c-0a1d2e3f4a5b";
    jar.set("player", signPlayerId(id, "c".repeat(32)));
    expect(
      (await dailyRoute(post({ date: "2026-10-09", mode: "guess" }))).status,
    ).toBe(201);
    expect(over.hit).not.toHaveBeenCalled();
  });
});
