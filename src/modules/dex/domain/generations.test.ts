import { describe, expect, it } from "vitest";

import {
  GENERATION_NAMES,
  GENERATIONS,
  generationOf,
} from "@modules/dex/domain/generations";

describe("generations", () => {
  it("puts each boundary in its own generation", () => {
    expect(generationOf(1)).toBe(1);
    expect(generationOf(151)).toBe(1);
    expect(generationOf(152)).toBe(2);
    expect(generationOf(905)).toBe(8);
    expect(generationOf(906)).toBe(9);
    expect(generationOf(1025)).toBe(9);
    expect(() => generationOf(1026)).toThrow();
  });

  it("names every generation in roman numerals", () => {
    expect(GENERATION_NAMES).toHaveLength(GENERATIONS);
    expect(GENERATION_NAMES[3]).toBe("Gen IV");
    expect(GENERATION_NAMES[8]).toBe("Gen IX");
  });
});
