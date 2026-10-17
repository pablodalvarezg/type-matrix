import { describe, expect, it } from "vitest";

import {
  evolves,
  findMove,
  findSpecies,
  snapshot,
  stageOf,
} from "@modules/dex/data/snapshot.repository";
import type { TypeName } from "@modules/dex/domain/dex";
import { effectiveness } from "@modules/dex/domain/effectiveness";
import { generationOf } from "@modules/dex/domain/generations";

/*
 * Checks the committed snapshot against facts of the games, not against the
 * code that produced it. Every expectation here is a known Gen VI+ value.
 */
const hit = (attack: TypeName, ...defender: TypeName[]) =>
  effectiveness(snapshot.typeChart, attack, defender);

describe("type chart", () => {
  it.each<[TypeName, TypeName]>([
    ["normal", "ghost"],
    ["ghost", "normal"],
    ["fighting", "ghost"],
    ["ground", "flying"],
    ["electric", "ground"],
    ["psychic", "dark"],
    ["poison", "steel"],
    ["dragon", "fairy"],
  ])("%s does nothing to %s", (attack, defender) => {
    expect(hit(attack, defender)).toBe(0);
  });

  it("stacks dual-type weaknesses and resistances", () => {
    expect(hit("electric", "water", "flying")).toBe(4);
    expect(hit("ice", "dragon", "flying")).toBe(4);
    expect(hit("fighting", "bug", "flying")).toBe(0.25);
    expect(hit("water", "water", "ground")).toBe(1);
  });

  it("lets an immunity cancel a weakness on a dual type", () => {
    expect(hit("ground", "electric", "flying")).toBe(0);
  });

  it("is the Gen VI+ chart", () => {
    expect(hit("fairy", "dragon")).toBe(2);
    expect(hit("steel", "fairy")).toBe(2);
    // Steel lost its ghost and dark resistances in Gen VI.
    expect(hit("ghost", "steel")).toBe(1);
    expect(hit("dark", "steel")).toBe(1);
  });
});

describe("species", () => {
  const bySlug = (slug: string) => snapshot.species.find((s) => s.slug === slug);

  it("has every species once, numbered 1 to 1025", () => {
    expect(snapshot.species.map((s) => s.id)).toEqual(
      Array.from({ length: 1025 }, (_, i) => i + 1),
    );
  });

  it("keeps names as the games write them", () => {
    expect(bySlug("mr-mime")?.name).toBe("Mr. Mime");
    expect(bySlug("nidoran-f")?.name).toBe("Nidoran♀");
    expect(bySlug("flabebe")?.name).toBe("Flabébé");
    expect(bySlug("type-null")?.name).toBe("Type: Null");
  });

  it("has current types and stats", () => {
    expect(bySlug("clefairy")?.types).toEqual(["fairy"]);
    expect(bySlug("mr-mime")?.types).toEqual(["psychic", "fairy"]);
    expect(bySlug("shedinja")?.stats.hp).toBe(1);
  });

  // battle's computeStats gives 1 HP to any base HP of 1, meaning Shedinja.
  it("has Shedinja as the only species with base HP 1", () => {
    const baseHpOne = snapshot.species.filter((s) => s.stats.hp === 1);
    expect(baseHpOne.map((s) => s.slug)).toEqual(["shedinja"]);
  });

  it("only references moves the snapshot defines", () => {
    const moves = new Set(snapshot.moves.map((m) => m.slug));
    const missing = snapshot.species.flatMap((s) =>
      s.moves.filter((move) => !moves.has(move)),
    );
    expect(missing).toEqual([]);
  });

  it("gives each species the moves it can learn", () => {
    expect(bySlug("pikachu")?.moves).toContain("thunderbolt");
    expect(bySlug("charizard")?.moves).toContain("flamethrower");
    expect(bySlug("charizard")?.moves).not.toContain("surf");
  });
});

describe("generations", () => {
  it.each([
    ["mew", 1],
    ["chikorita", 2],
    ["treecko", 3],
    ["arceus", 4],
    ["victini", 5],
    ["chespin", 6],
    ["rowlet", 7],
    ["meltan", 7],
    ["grookey", 8],
    ["sprigatito", 9],
    ["pecharunt", 9],
  ])("puts %s in generation %i", (slug, gen) => {
    expect(generationOf(findSpecies(slug)!.id)).toBe(gen);
  });
});

describe("evolution stages", () => {
  it.each([
    ["pichu", 1],
    ["pikachu", 2],
    ["raichu", 3],
    ["mr-mime", 2],
    ["eevee", 1],
    ["minior", 1],
    // Its pre-evolution is Galarian Meowth, a form the snapshot leaves out.
    ["perrserker", 2],
  ])("puts %s at stage %i", (slug, stage) => {
    expect(stageOf(slug)).toBe(stage);
  });
});

describe("evolves", () => {
  it.each([
    ["pikachu", true],
    ["raichu", false],
    ["eevee", true],
    ["tauros", false],
    ["bisharp", true],
    ["kingambit", false],
    // PokéAPI chains it to Sirfetch'd, though only Galarian Farfetch'd
    // evolves; followed as is (decided by Pablo on 2026-10-14).
    ["farfetchd", true],
  ])("says whether %s evolves: %s", (slug, expected) => {
    expect(evolves(slug)).toBe(expected);
  });
});

describe("move accuracy", () => {
  it("is a percent, or null for a move that never misses", () => {
    expect(findMove("hydro-pump")?.accuracy).toBe(80);
    expect(findMove("swift")?.accuracy).toBeNull();
  });
});

describe("color, height and weight", () => {
  it.each([
    ["pikachu", "yellow", 4, 60],
    ["snorlax", "black", 21, 4600],
    ["wailord", "blue", 145, 3980],
    ["gengar", "purple", 15, 405],
  ])("has %s as %s, %i dm and %i hg", (slug, color, height, weight) => {
    expect(findSpecies(slug)).toMatchObject({ color, height, weight });
  });
});

describe("lookups", () => {
  it("finds a species by name, in any case, or by slug", () => {
    expect(findSpecies("Mr. Mime")?.slug).toBe("mr-mime");
    expect(findSpecies("  mr. mime ")?.slug).toBe("mr-mime");
    expect(findSpecies("mr-mime")?.slug).toBe("mr-mime");
    expect(findSpecies("Nidoran♀")?.slug).toBe("nidoran-f");
    expect(findSpecies("Missingno")).toBeUndefined();
  });

  it("finds a move by name or slug", () => {
    expect(findMove("Close Combat")?.slug).toBe("close-combat");
    expect(findMove("close-combat")?.name).toBe("Close Combat");
    expect(findMove("Splash")).toBeUndefined();
  });
});

describe("moves", () => {
  it("has no moves cut before Gen IX", () => {
    expect(snapshot.moves.map((m) => m.slug)).not.toContain("hidden-power");
  });

  it("has no multi-hit moves PokéAPI flags", () => {
    const slugs = snapshot.moves.map((m) => m.slug);
    for (const multiHit of [
      "bullet-seed",
      "double-kick",
      "triple-axel",
      "dragon-darts",
      "surging-strikes",
    ]) {
      expect(slugs).not.toContain(multiHit);
    }
  });
});
