import { describe, expect, it } from "vitest";

import { runCalculator } from "@modules/battle/battle.service";

describe("runCalculator", () => {
  it("shows an empty form without errors on the first visit", () => {
    const view = runCalculator({});
    expect(view.errors).toEqual({});
    expect(view.result).toBeNull();
    expect(view.moveNames).toEqual([]);
    expect(view.speciesNames).toHaveLength(1025);
  });

  it("lists the attacker's moves before a move is picked", () => {
    const view = runCalculator({ "attacker.species": "garchomp" });
    expect(view.moveNames).toContain("Earthquake");
    expect(view.errors).toEqual({});
    expect(view.result).toBeNull();
  });

  it("matches the reference end to end, from the snapshot's base stats", () => {
    // @smogon/calc 0.12.0: 252 Atk Jolly Garchomp Earthquake vs. 252 HP
    // Heatran: 624-736 (161.6 - 190.6%).
    const { result, errors } = runCalculator({
      "attacker.species": "Garchomp",
      "attacker.evs.atk": "252",
      "attacker.up": "spe",
      "attacker.down": "spa",
      "defender.species": "Heatran",
      "defender.evs.hp": "252",
      move: "Earthquake",
    });
    expect(errors).toEqual({});
    expect(result).toMatchObject({
      rolls: [
        624, 628, 640, 648, 652, 660, 664, 676, 684, 688, 696, 708, 712, 720,
        724, 736,
      ],
      minPercent: 161.6,
      maxPercent: 190.6,
      stab: true,
      effectiveness: 4,
      defenderHp: 386,
    });
  });

  it("gives Shedinja 1 HP end to end", () => {
    // @smogon/calc 0.12.0: level 50 Arcanine Flamethrower vs. level 50
    // Shedinja: 246-290 (24600 - 29000%).
    const { result } = runCalculator({
      "attacker.species": "Arcanine",
      "attacker.level": "50",
      "defender.species": "Shedinja",
      "defender.level": "50",
      move: "Flamethrower",
    });
    expect(result).toMatchObject({
      minPercent: 24600,
      maxPercent: 29000,
      defenderHp: 1,
    });
  });

  it("reports an immunity as 0 damage", () => {
    const { result } = runCalculator({
      "attacker.species": "Garchomp",
      "defender.species": "Corviknight",
      move: "Earthquake",
    });
    expect(result?.effectiveness).toBe(0);
    expect(result?.rolls).toEqual(Array(16).fill(0));
  });

  it("only reports burn on a physical move", () => {
    const burned = (move: string) =>
      runCalculator({
        "attacker.species": "Charizard",
        "attacker.burned": "on",
        "defender.species": "Venusaur",
        move,
      }).result?.burned;
    expect(burned("Flare Blitz")).toBe(true);
    expect(burned("Flamethrower")).toBe(false);
  });

  it("names unknown species and moves", () => {
    const { errors, result } = runCalculator({
      "attacker.species": "Missingno",
      "defender.species": "Pikachu",
      move: "Splash",
    });
    expect(errors).toEqual({
      "attacker.species": 'No species called "Missingno"',
      move: 'No damaging move called "Splash"',
    });
    expect(result).toBeNull();
  });

  it("rejects a move the attacker cannot learn", () => {
    const { errors } = runCalculator({
      "attacker.species": "Charizard",
      "defender.species": "Pikachu",
      move: "Surf",
    });
    expect(errors).toEqual({ move: "Charizard can't learn Surf" });
  });

  it("says so when the attacker has no move to calculate", () => {
    const { errors, moveNames } = runCalculator({
      "attacker.species": "Ditto",
    });
    expect(moveNames).toEqual([]);
    expect(errors.move).toBe(
      "Ditto learns no damaging move this calculator models",
    );
  });

  it("keeps the move list while another field is invalid", () => {
    const view = runCalculator({
      "attacker.species": "Garchomp",
      "attacker.level": "101",
    });
    expect(view.errors).toEqual({ "attacker.level": "1 to 100" });
    expect(view.moveNames).toContain("Earthquake");
    expect(view.values["attacker.level"]).toBe("101");
  });
});
