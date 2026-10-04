import { describe, expect, it } from "vitest";

import type { TypeChart } from "@modules/dex/domain/dex";
import { effectiveness } from "@modules/dex/domain/effectiveness";

// A hand-made chart, so this tests the arithmetic and not the data.
const chart = {
  fire: { grass: 2, steel: 2, water: 0.5 },
  ground: { flying: 0, electric: 2 },
  normal: {},
} as unknown as TypeChart;

describe("effectiveness", () => {
  it("is neutral for a pair the chart does not list", () => {
    expect(effectiveness(chart, "normal", ["water"])).toBe(1);
  });

  it("multiplies over both defending types", () => {
    expect(effectiveness(chart, "fire", ["grass", "steel"])).toBe(4);
    expect(effectiveness(chart, "fire", ["grass", "water"])).toBe(1);
  });

  it("lets an immunity win over a weakness", () => {
    expect(effectiveness(chart, "ground", ["electric", "flying"])).toBe(0);
  });
});
