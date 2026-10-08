import { describe, expect, it } from "vitest";

import { parseEnv } from "@shared/config/env-schema";

const valid = {
  DATABASE_URL: "postgresql://user:pass@host.neon.tech/db?sslmode=require",
  DAILY_SECRET: "d".repeat(32),
  COOKIE_SECRET: "c".repeat(32),
  LAUNCH_DATE: "2026-10-03",
};

describe("parseEnv", () => {
  it("accepts a complete environment", () => {
    expect(parseEnv(valid)).toEqual({ ...valid, NODE_ENV: "development" });
  });

  it.each(Object.keys(valid))("rejects a missing %s", (key) => {
    expect(() => parseEnv({ ...valid, [key]: undefined })).toThrow(key);
  });

  it("rejects a short daily secret", () => {
    expect(() => parseEnv({ ...valid, DAILY_SECRET: "short" })).toThrow(
      "DAILY_SECRET",
    );
  });

  it("rejects a launch date that is not YYYY-MM-DD", () => {
    expect(() => parseEnv({ ...valid, LAUNCH_DATE: "03/10/2026" })).toThrow(
      "LAUNCH_DATE",
    );
  });
});
