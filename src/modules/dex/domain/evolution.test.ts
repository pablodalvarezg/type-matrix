import { describe, expect, it } from "vitest";

import { stages } from "@modules/dex/domain/evolution";

describe("stages", () => {
  it("counts from the species that evolves from nothing", () => {
    const result = stages([
      { slug: "c", evolvesFrom: "b" },
      { slug: "a", evolvesFrom: null },
      { slug: "b", evolvesFrom: "a" },
      { slug: "lone", evolvesFrom: null },
    ]);
    expect(Object.fromEntries(result)).toEqual({ a: 1, b: 2, c: 3, lone: 1 });
  });

  it("gives branches the same stage", () => {
    const result = stages([
      { slug: "a", evolvesFrom: null },
      { slug: "b1", evolvesFrom: "a" },
      { slug: "b2", evolvesFrom: "a" },
    ]);
    expect([result.get("b1"), result.get("b2")]).toEqual([2, 2]);
  });

  it("fails on a pre-evolution the list does not have", () => {
    expect(() => stages([{ slug: "b", evolvesFrom: "a" }])).toThrow("a");
  });
});
