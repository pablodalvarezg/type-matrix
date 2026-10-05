import { describe, expect, it } from "vitest";

import {
  damage,
  pokeRound,
  type DamageInput,
} from "@modules/battle/domain/damage";
import type { Stats } from "@modules/battle/domain/stats";

/*
 * Expected rolls come from the reference calculator, @smogon/calc 0.12.0
 * (Gen 9, singles, inert ability, no item), run outside the repo and copied
 * by hand. The comment on each case is the calculator's input, checkable at
 * calc.pokemonshowdown.com. Stats are the ones the calculator derived.
 */
const side = (values: Partial<Stats>): Stats => ({
  hp: 1,
  atk: 1,
  def: 1,
  spa: 1,
  spd: 1,
  spe: 1,
  ...values,
});

const physical = (power: number) => ({ power, category: "physical" as const });
const special = (power: number) => ({ power, category: "special" as const });

const base: Omit<DamageInput, "attacker" | "defender" | "move"> = {
  level: 100,
  stab: false,
  effectiveness: 1,
  critical: false,
  burned: false,
};

// 252 Atk Jolly Garchomp Earthquake vs. 252 HP / 252 Def Bold Blissey, the
// base of the crit and burn cases.
const garchompOnBlissey: DamageInput = {
  ...base,
  attacker: side({ atk: 359 }),
  defender: side({ hp: 714, def: 130 }),
  move: physical(100),
  stab: true,
};

// 252 SpA Timid Gengar Thunderbolt vs. 252 HP / 4 SpD Blissey.
const gengarOnBlissey: DamageInput = {
  ...base,
  attacker: side({ spa: 359 }),
  defender: side({ hp: 714, spd: 307 }),
  move: special(90),
};

describe("damage", () => {
  it.each<[string, DamageInput, number[], number, number]>([
    [
      // 252 Atk Jolly Garchomp Earthquake vs. 252 HP / 0 Def Heatran.
      "STAB, ×4",
      {
        ...base,
        attacker: side({ atk: 359 }),
        defender: side({ hp: 386, def: 248 }),
        move: physical(100),
        stab: true,
        effectiveness: 4,
      },
      [
        624, 628, 640, 648, 652, 660, 664, 676, 684, 688, 696, 708, 712, 720,
        724, 736,
      ],
      161.6,
      190.6,
    ],
    [
      // 252 Atk Adamant Garchomp Earthquake vs. 252 HP / 252 Def Bold Blissey.
      "STAB, neutral",
      {
        ...base,
        attacker: side({ atk: 394 }),
        defender: side({ hp: 714, def: 130 }),
        move: physical(100),
        stab: true,
      },
      [
        325, 330, 333, 337, 340, 345, 348, 352, 357, 360, 364, 367, 372, 375,
        379, 384,
      ],
      45.5,
      53.7,
    ],
    [
      "special, no STAB",
      gengarOnBlissey,
      [76, 77, 78, 79, 80, 81, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
      10.6,
      12.6,
    ],
    [
      // 252 Atk Adamant Machamp Close Combat vs. 252 HP / 0 Def Butterfree.
      "STAB, ×0.25",
      {
        ...base,
        attacker: side({ atk: 394 }),
        defender: side({ hp: 324, def: 136 }),
        move: physical(120),
        stab: true,
        effectiveness: 0.25,
      },
      [
        93, 94, 95, 96, 97, 99, 100, 101, 102, 103, 104, 105, 106, 108, 109,
        110,
      ],
      28.7,
      33.9,
    ],
    [
      // Level 50: 252+ SpA Modest Dragapult Draco Meteor vs. 4 HP Garchomp.
      "level 50, STAB, ×2",
      {
        ...base,
        level: 50,
        attacker: side({ spa: 167 }),
        defender: side({ hp: 184, spd: 105 }),
        move: special(130),
        stab: true,
        effectiveness: 2,
      },
      [
        234, 236, 240, 240, 242, 246, 248, 252, 254, 258, 260, 264, 266, 270,
        272, 276,
      ],
      127.1,
      150,
    ],
    [
      "critical hit",
      { ...garchompOnBlissey, critical: true },
      [
        444, 450, 454, 460, 465, 471, 475, 481, 486, 492, 496, 502, 507, 513,
        517, 523,
      ],
      62.1,
      73.2,
    ],
    [
      "burned, physical",
      { ...garchompOnBlissey, burned: true },
      [
        148, 150, 151, 153, 155, 156, 159, 160, 162, 164, 165, 167, 169, 171,
        172, 174,
      ],
      20.7,
      24.3,
    ],
    [
      "burned, special: burn does not apply",
      { ...gengarOnBlissey, burned: true },
      [76, 77, 78, 79, 80, 81, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
      10.6,
      12.6,
    ],
    [
      // Level 50: burned 252 Atk Charizard Flare Blitz (crit) vs. Venusaur.
      "critical, burned, STAB, ×2",
      {
        ...base,
        level: 50,
        attacker: side({ atk: 136 }),
        defender: side({ hp: 155, def: 103 }),
        move: physical(120),
        stab: true,
        effectiveness: 2,
        critical: true,
        burned: true,
      },
      [
        135, 136, 138, 139, 141, 142, 144, 145, 147, 148, 150, 151, 153, 154,
        156, 159,
      ],
      87.0,
      102.5,
    ],
    [
      // Level 1, 0 IVs Magikarp Tackle vs. 252 HP / 252+ Def Impish Shuckle.
      "minimum damage of 1",
      {
        ...base,
        level: 1,
        attacker: side({ atk: 5 }),
        defender: side({ hp: 244, def: 614 }),
        move: physical(40),
        effectiveness: 0.5,
      },
      Array(16).fill(1),
      0.4,
      0.4,
    ],
    [
      // Level 50 Arcanine Flamethrower vs. level 50 Shedinja.
      "Shedinja's 1 HP",
      {
        ...base,
        level: 50,
        attacker: side({ spa: 120 }),
        defender: side({ hp: 1, spd: 50 }),
        move: special(90),
        stab: true,
        effectiveness: 2,
      },
      [
        246, 248, 252, 254, 258, 260, 264, 266, 270, 272, 276, 278, 282, 284,
        288, 290,
      ],
      24600,
      29000,
    ],
  ])("%s", (_, input, rolls, minPercent, maxPercent) => {
    expect(damage(input)).toEqual({ rolls, minPercent, maxPercent });
  });

  it("does nothing to an immune target, without the minimum of 1", () => {
    // 252 Atk Jolly Garchomp Earthquake vs. Corviknight.
    const result = damage({
      ...base,
      attacker: side({ atk: 359 }),
      defender: side({ hp: 337, def: 246 }),
      move: physical(100),
      stab: true,
      effectiveness: 0,
    });
    expect(result).toEqual({
      rolls: Array(16).fill(0),
      minPercent: 0,
      maxPercent: 0,
    });
  });
});

describe("pokeRound", () => {
  it("rounds an exact half down, unlike Math.round", () => {
    expect(pokeRound(2.5)).toBe(2);
    expect(Math.round(2.5)).toBe(3);
  });

  it("rounds anything above the half up and below it down", () => {
    expect(pokeRound(2.51)).toBe(3);
    expect(pokeRound(2.49)).toBe(2);
    expect(pokeRound(3)).toBe(3);
  });
});
