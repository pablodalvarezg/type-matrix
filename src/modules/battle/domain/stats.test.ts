import { describe, expect, it } from "vitest";

import {
  computeStats,
  type Nature,
  type Stats,
} from "@modules/battle/domain/stats";

/*
 * Expected values come from the reference calculator, @smogon/calc 0.12.0
 * (Gen 9), run outside the repo and copied by hand. Each case can be checked
 * at calc.pokemonshowdown.com with the same inputs. IVs default to 31.
 */
const spread = (values: Partial<Stats> = {}, fill = 0): Stats => ({
  hp: fill,
  atk: fill,
  def: fill,
  spa: fill,
  spd: fill,
  spe: fill,
  ...values,
});
const NEUTRAL: Nature = { up: null, down: null };

describe("computeStats", () => {
  it("matches the reference at level 100 with a boosting nature", () => {
    // Garchomp, 252 Atk / 252 Spe, Jolly (+Spe −SpA).
    const stats = computeStats({
      level: 100,
      base: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      ivs: spread({}, 31),
      evs: spread({ atk: 252, spe: 252 }),
      nature: { up: "spe", down: "spa" },
    });
    expect(stats).toEqual({
      hp: 357,
      atk: 359,
      def: 226,
      spa: 176,
      spd: 206,
      spe: 333,
    });
  });

  it("matches the reference at level 50", () => {
    // Blissey, 252 HP / 252 Def, Bold (+Def −Atk).
    const stats = computeStats({
      level: 50,
      base: { hp: 255, atk: 10, def: 10, spa: 75, spd: 135, spe: 55 },
      ivs: spread({}, 31),
      evs: spread({ hp: 252, def: 252 }),
      nature: { up: "def", down: "atk" },
    });
    expect(stats).toEqual({
      hp: 362,
      atk: 27,
      def: 68,
      spa: 95,
      spd: 155,
      spe: 75,
    });
  });

  it("floors EVs to multiples of 4 and handles low IVs at a low level", () => {
    // Pikachu, level 5, 0 Atk / 0 SpA IVs, 3 SpA EVs, Modest (+SpA −Atk).
    const stats = computeStats({
      level: 5,
      base: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
      ivs: spread({ atk: 0, spa: 0 }, 31),
      evs: spread({ spa: 3 }),
      nature: { up: "spa", down: "atk" },
    });
    expect(stats).toEqual({
      hp: 20,
      atk: 9,
      def: 10,
      spa: 11,
      spd: 11,
      spe: 15,
    });
  });

  it("works at level 1 with zero IVs", () => {
    // Magikarp, level 1, every IV 0.
    const stats = computeStats({
      level: 1,
      base: { hp: 20, atk: 10, def: 55, spa: 15, spd: 20, spe: 80 },
      ivs: spread(),
      evs: spread(),
      nature: NEUTRAL,
    });
    expect(stats).toEqual({ hp: 11, atk: 5, def: 6, spa: 5, spd: 5, spe: 6 });
  });

  it("gives Shedinja 1 HP whatever its EVs", () => {
    // Shedinja, 252 HP EVs.
    const stats = computeStats({
      level: 100,
      base: { hp: 1, atk: 90, def: 45, spa: 30, spd: 30, spe: 40 },
      ivs: spread({}, 31),
      evs: spread({ hp: 252 }),
      nature: NEUTRAL,
    });
    expect(stats).toEqual({
      hp: 1,
      atk: 216,
      def: 126,
      spa: 96,
      spd: 96,
      spe: 116,
    });
  });

  it("treats a nature that raises and lowers the same stat as neutral", () => {
    const input = {
      level: 100,
      base: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      ivs: spread({}, 31),
      evs: spread({ atk: 252 }),
    };
    expect(
      computeStats({ ...input, nature: { up: "atk", down: "atk" } }),
    ).toEqual(computeStats({ ...input, nature: NEUTRAL }));
  });
});
