import { beforeEach, describe, expect, it, vi } from "vitest";

import { LIMITS, throttle } from "@shared/http/throttle";

const hits = vi.hoisted(() => new Map<string, number>());
vi.mock("@shared/db/rate-limit", () => ({
  hit: async (key: string) => {
    hits.set(key, (hits.get(key) ?? 0) + 1);
    return hits.get(key);
  },
}));

const from = (ip: string) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });

describe("throttle", () => {
  beforeEach(() => hits.clear());

  it("lets an IP through up to its cap, then answers 429", async () => {
    for (let i = 0; i < LIMITS.nickname; i++) {
      expect(await throttle(from("1.2.3.4"), "nickname")).toBeUndefined();
    }
    expect((await throttle(from("1.2.3.4"), "nickname"))?.status).toBe(429);
  });

  it("counts each IP and each bucket apart", async () => {
    for (let i = 0; i < LIMITS.nickname; i++) {
      await throttle(from("1.2.3.4"), "nickname");
    }
    expect(await throttle(from("5.6.7.8"), "nickname")).toBeUndefined();
    expect(await throttle(from("1.2.3.4"), "games")).toBeUndefined();
  });

  it("keys on the client, the first address of the chain", async () => {
    await throttle(from("1.2.3.4, 10.0.0.1"), "games");
    expect([...hits.keys()]).toEqual(["games:1.2.3.4"]);
  });

  it.each([
    ["2001:db8:1:2:aaaa:bbbb:cccc:dddd", "2001:db8:1:2::/64"],
    ["2001:db8:1:2::1", "2001:db8:1:2::/64"],
    ["2001:db8::1", "2001:db8:0:0::/64"],
    ["::1", "0:0:0:0::/64"],
    ["::ffff:1.2.3.4", "::ffff:1.2.3.4"],
  ])("keys IPv6 %s by its /64: %s", async (ip, key) => {
    await throttle(from(ip), "games");
    expect([...hits.keys()]).toEqual([`games:${key}`]);
  });
});
