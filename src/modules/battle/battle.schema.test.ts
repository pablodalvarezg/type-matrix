import { describe, expect, it } from "vitest";

import { parseCalculator } from "@modules/battle/battle.schema";

const SIDE_DEFAULTS = {
  level: 100,
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  up: null,
  down: null,
};

describe("parseCalculator", () => {
  it("fills every missing field with its default", () => {
    expect(parseCalculator({})).toEqual({
      input: {
        attacker: { ...SIDE_DEFAULTS, species: undefined, burned: false },
        defender: { ...SIDE_DEFAULTS, species: undefined },
        move: undefined,
        critical: false,
      },
      errors: {},
    });
  });

  it("treats a blank field like a missing one", () => {
    const { input } = parseCalculator({
      "attacker.species": "  ",
      "attacker.level": "",
      "attacker.ivs.atk": "",
      "attacker.up": "",
    });
    expect(input?.attacker).toMatchObject({
      species: undefined,
      level: 100,
      ivs: { atk: 31 },
      up: null,
    });
  });

  it("reads the fields a person filled in", () => {
    const { input } = parseCalculator({
      "attacker.species": " Garchomp ",
      "attacker.level": "50",
      "attacker.evs.atk": "252",
      "attacker.up": "spe",
      "attacker.down": "spa",
      "attacker.burned": "on",
      "defender.ivs.def": "0",
      move: "Earthquake",
      critical: "on",
    });
    expect(input).toMatchObject({
      attacker: {
        species: "Garchomp",
        level: 50,
        evs: { atk: 252 },
        up: "spe",
        down: "spa",
        burned: true,
      },
      defender: { ivs: { def: 0 } },
      move: "Earthquake",
      critical: true,
    });
  });

  it("names the field of each error by its param name", () => {
    expect(
      parseCalculator({
        "attacker.level": "0",
        "attacker.ivs.hp": "32",
        "defender.evs.spe": "1e2",
        "defender.up": "hp",
      }).errors,
    ).toEqual({
      "attacker.level": "1 to 100",
      "attacker.ivs.hp": "0 to 31",
      "defender.evs.spe": "Whole numbers only",
      "defender.up": expect.any(String),
    });
  });

  it("takes a nature only with both a raised and a lowered stat", () => {
    expect(
      parseCalculator({ "attacker.up": "atk", "defender.down": "spe" }).errors,
    ).toEqual({
      "attacker.down": "A nature raises one stat and lowers another: pick both",
      "defender.up": "A nature raises one stat and lowers another: pick both",
    });
    // Hardy, Docile…: the same stat both ways is a neutral nature.
    expect(
      parseCalculator({ "attacker.up": "atk", "attacker.down": "atk" }).errors,
    ).toEqual({});
  });

  it("caps the EV total at 510", () => {
    const evs = (def: string) => ({
      "attacker.evs.hp": "252",
      "attacker.evs.atk": "252",
      "attacker.evs.def": def,
    });
    expect(parseCalculator(evs("6")).errors).toEqual({});
    expect(parseCalculator(evs("7")).errors).toEqual({
      "attacker.evs": "510 EVs in total at most",
    });
  });

  it("takes the first value of a repeated param", () => {
    const { input } = parseCalculator({ "attacker.level": ["5", "60"] });
    expect(input?.attacker.level).toBe(5);
  });
});
