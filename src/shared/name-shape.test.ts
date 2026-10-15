import { describe, expect, it } from "vitest";

import { describeShape } from "@shared/name-shape";

describe("describeShape", () => {
  it("says a one-part name as a total", () => {
    expect(describeShape({ parts: [7] })).toBe("7 letters");
  });

  it("says each part, and what joins them", () => {
    expect(describeShape({ parts: [2, 4], joiner: "space" })).toBe(
      "2 + 4 letters, with a space",
    );
    expect(describeShape({ parts: [3, 2], joiner: "hyphen" })).toBe(
      "3 + 2 letters, with a hyphen",
    );
  });
});
