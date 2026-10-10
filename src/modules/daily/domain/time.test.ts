import { describe, expect, it } from "vitest";

import { duration, untilMidnight } from "@modules/daily/domain/time";

describe("untilMidnight", () => {
  it("counts to the next local midnight", () => {
    expect(untilMidnight(new Date(2026, 9, 9, 23, 59, 30))).toBe(30_000);
    expect(untilMidnight(new Date(2026, 9, 9, 0, 0, 0))).toBe(86_400_000);
  });
});

describe("duration", () => {
  it("is m:ss under an hour, seconds floored", () => {
    expect(duration(0)).toBe("0:00");
    expect(duration(59_999)).toBe("0:59");
    expect(duration(65_000)).toBe("1:05");
    expect(duration(3_599_999)).toBe("59:59");
  });

  it("adds hours from an hour on", () => {
    expect(duration(3_600_000)).toBe("1:00:00");
    expect(duration(30 * 3_600_000 + 61_000)).toBe("30:01:01");
  });

  it("shows a countdown that overshot as zero", () => {
    expect(duration(-5)).toBe("0:00");
  });
});
