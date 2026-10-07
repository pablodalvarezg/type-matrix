import { describe, expect, it } from "vitest";

import { runTeam } from "@modules/team/team.service";

/*
 * Real species from the snapshot. Their typings, as ingested: Garchomp
 * Dragon/Ground, Gligar Ground/Flying, Skarmory Steel/Flying, Pikachu
 * Electric, Tangela Grass.
 */
describe("runTeam", () => {
  it("shows an empty form without errors or result on the first visit", () => {
    const view = runTeam({});
    expect(view.errors).toEqual({});
    expect(view.result).toBeNull();
    expect(view.speciesNames).toHaveLength(1025);
  });

  it("rejects a repeated species in its own field, with no result", () => {
    const view = runTeam({ "member.1": "Garchomp", "member.3": " garchomp " });
    expect(view.errors).toEqual({
      "member.3": "Garchomp is already on the team",
    });
    expect(view.result).toBeNull();
  });

  it("rejects an unknown species", () => {
    const view = runTeam({ "member.2": "Missingno" });
    expect(view.errors).toEqual({
      "member.2": 'No species called "Missingno"',
    });
    expect(view.result).toBeNull();
  });

  it("analyses real species with any empty slots skipped", () => {
    const { result, errors } = runTeam({
      "member.1": "Garchomp",
      "member.4": "Gligar",
      "member.6": "Skarmory",
    });
    expect(errors).toEqual({});
    expect(result?.members).toEqual([
      { name: "Garchomp", types: ["dragon", "ground"] },
      { name: "Gligar", types: ["ground", "flying"] },
      { name: "Skarmory", types: ["steel", "flying"] },
    ]);
    const row = (attack: string) =>
      result?.weaknesses.find((w) => w.attack === attack);
    // Ice: ×4 on Garchomp and Gligar, ×1 on Skarmory (Ice→Steel ×0.5 ×
    // Ice→Flying ×2): two weak, nobody resisting.
    expect(row("ice")).toMatchObject({ weak: 2, resist: 0, warning: true });
    // Ground: ×0 on Gligar and Skarmory (Ground→Flying ×0).
    expect(row("ground")).toMatchObject({ immune: 2, warning: false });
  });

  it("finds a dual-type hole whose halves are both covered", () => {
    // Electric→Flying ×2 and Grass→Ground ×2, but against Gligar's
    // Ground/Flying: Electric ×2 × ×0 = ×0, Grass ×2 × ×0.5 = ×1.
    const { result } = runTeam({
      "member.1": "Pikachu",
      "member.2": "Tangela",
    });
    const best = (type: string) =>
      result?.coverage.find((c) => c.defender[0] === type)?.best;
    expect(best("flying")).toBe(2);
    expect(best("ground")).toBe(2);
    expect(result?.holes).toContainEqual({
      defender: ["flying", "ground"],
      best: 1,
    });
  });
});
