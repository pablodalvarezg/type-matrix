import { describe, expect, it } from "vitest";

import { analyzeTeam, dualTypes, type Typing } from "@modules/team/domain/team";

/*
 * The type chart and type order, copied verbatim from data/snapshot.json
 * (typeChart, and TYPE_NAMES in dex/domain/dex.ts). This layer may not import
 * either, nor dex's effectiveness, so every multiplier below can be checked
 * against these lines. The service passes the real effectiveness.
 */
// prettier-ignore
const TYPES = [
  "normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost",
  "steel", "fire", "water", "grass", "electric", "psychic", "ice", "dragon",
  "dark", "fairy",
];
// prettier-ignore
const CHART: Record<string, Partial<Record<string, number>>> = {
  normal: { ghost: 0, rock: 0.5, steel: 0.5 },
  fighting: { bug: 0.5, dark: 2, fairy: 0.5, flying: 0.5, ghost: 0, ice: 2, normal: 2, poison: 0.5, psychic: 0.5, rock: 2, steel: 2 },
  flying: { bug: 2, electric: 0.5, fighting: 2, grass: 2, rock: 0.5, steel: 0.5 },
  poison: { fairy: 2, ghost: 0.5, grass: 2, ground: 0.5, poison: 0.5, rock: 0.5, steel: 0 },
  ground: { bug: 0.5, electric: 2, fire: 2, flying: 0, grass: 0.5, poison: 2, rock: 2, steel: 2 },
  rock: { bug: 2, fighting: 0.5, fire: 2, flying: 2, ground: 0.5, ice: 2, steel: 0.5 },
  bug: { dark: 2, fairy: 0.5, fighting: 0.5, fire: 0.5, flying: 0.5, ghost: 0.5, grass: 2, poison: 0.5, psychic: 2, steel: 0.5 },
  ghost: { dark: 0.5, ghost: 2, normal: 0, psychic: 2 },
  steel: { electric: 0.5, fairy: 2, fire: 0.5, ice: 2, rock: 2, steel: 0.5, water: 0.5 },
  fire: { bug: 2, dragon: 0.5, fire: 0.5, grass: 2, ice: 2, rock: 0.5, steel: 2, water: 0.5 },
  water: { dragon: 0.5, fire: 2, grass: 0.5, ground: 2, rock: 2, water: 0.5 },
  grass: { bug: 0.5, dragon: 0.5, fire: 0.5, flying: 0.5, grass: 0.5, ground: 2, poison: 0.5, rock: 2, steel: 0.5, water: 2 },
  electric: { dragon: 0.5, electric: 0.5, flying: 2, grass: 0.5, ground: 0, water: 2 },
  psychic: { dark: 0, fighting: 2, poison: 2, psychic: 0.5, steel: 0.5 },
  ice: { dragon: 2, fire: 0.5, flying: 2, grass: 2, ground: 2, ice: 0.5, steel: 0.5, water: 0.5 },
  dragon: { dragon: 2, fairy: 0, steel: 0.5 },
  dark: { dark: 0.5, fairy: 0.5, fighting: 0.5, ghost: 2, psychic: 2 },
  fairy: { dark: 2, dragon: 2, fighting: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
};

// The same product as dex's effectiveness: dual types multiply.
const multiplier = (attack: string, defender: Typing) =>
  defender.reduce((product, type) => product * (CHART[attack]?.[type] ?? 1), 1);

const analyze = (members: Typing[], dualDefenders: Typing[] = []) =>
  analyzeTeam({ multiplier, types: TYPES, members, dualDefenders });

const row = (members: Typing[], attack: string) =>
  analyze(members).weaknesses.find((w) => w.attack === attack);

describe("shared weaknesses", () => {
  it("counts a dual type that cancels out as neither weak nor resisting", () => {
    // Fire→Water ×0.5 × Fire→Grass ×2 = ×1.
    expect(row([["water", "grass"]], "fire")).toMatchObject({
      weak: 0,
      resist: 0,
      immune: 0,
    });
  });

  it("lets an immunity cover a weakness", () => {
    // Ground→Flying ×0 × Ground→Steel ×2 = ×0.
    expect(row([["flying", "steel"]], "ground")).toMatchObject({
      weak: 0,
      immune: 1,
    });
  });

  it("counts ×4 as weak", () => {
    // Ice→Dragon ×2 × Ice→Ground ×2 = ×4.
    expect(row([["dragon", "ground"]], "ice")).toMatchObject({ weak: 1 });
  });

  it("gives an empty team all zeros and no warnings", () => {
    const { weaknesses } = analyze([]);
    expect(weaknesses.map((w) => w.attack)).toEqual(TYPES);
    for (const w of weaknesses) {
      expect(w).toMatchObject({
        weak: 0,
        resist: 0,
        immune: 0,
        warning: false,
      });
    }
  });

  it("does not warn on a single weak member", () => {
    // Ice→Dragon ×2 × Ice→Ground ×2 = ×4.
    expect(row([["dragon", "ground"]], "ice")).toMatchObject({
      warning: false,
    });
  });

  it("warns on two weak members of a partial team and nobody resisting", () => {
    // Ice→Dragon/Ground ×4 and Ice→Flying ×2.
    expect(row([["dragon", "ground"], ["flying"]], "ice")).toMatchObject({
      weak: 2,
      warning: true,
    });
  });

  it("does not warn once a member resists", () => {
    // Same two, plus Ice→Steel ×0.5.
    expect(
      row([["dragon", "ground"], ["flying"], ["steel"]], "ice"),
    ).toMatchObject({ weak: 2, resist: 1, warning: false });
  });

  it("does not warn once a member is immune", () => {
    // Ground→Fire ×2, Ground→Electric ×2, Ground→Flying ×0.
    expect(row([["fire"], ["electric"], ["flying"]], "ground")).toMatchObject({
      weak: 2,
      immune: 1,
      warning: false,
    });
  });
});

describe("offensive coverage", () => {
  const best = (members: Typing[], defender: string) =>
    analyze(members).coverage.find((c) => c.defender[0] === defender)?.best;

  it("takes the best of two STAB types that complement each other", () => {
    // Ground→Flying ×0 but Flying→Flying ×1; Flying→Electric ×0.5 but
    // Ground→Electric ×2; Ground→Grass ×0.5 but Flying→Grass ×2.
    const team = [["ground"], ["flying"]];
    expect(best(team, "flying")).toBe(1);
    expect(best(team, "electric")).toBe(2);
    expect(best(team, "grass")).toBe(2);
  });

  it("reaches nothing with an empty team", () => {
    expect(analyze([]).coverage.every((c) => c.best === 0)).toBe(true);
  });

  it("lists a dual type as a hole even when each half is covered", () => {
    // Electric→Flying ×2 and Grass→Ground ×2 cover both halves, but
    // Electric→Flying/Ground = ×2 × ×0 = ×0 and Grass→Flying/Ground =
    // ×0.5 × ×2 = ×1.
    const team = [["electric"], ["grass"]];
    expect(best(team, "flying")).toBe(2);
    expect(best(team, "ground")).toBe(2);
    expect(analyze(team, [["ground", "flying"]]).holes).toEqual([
      { defender: ["ground", "flying"], best: 1 },
    ]);
  });

  it("leaves a dual type out of the holes when STAB beats ×1", () => {
    // Electric→Water ×2 × Electric→Flying ×2 = ×4.
    expect(analyze([["electric"]], [["water", "flying"]]).holes).toEqual([]);
  });
});

describe("dualTypes", () => {
  it("keeps each two-type defender once, in type order, and skips single types", () => {
    expect(
      dualTypes(TYPES, [["fire", "flying"], ["flying", "fire"], ["water"]]),
    ).toEqual([["flying", "fire"]]);
  });
});
