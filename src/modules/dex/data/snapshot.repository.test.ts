import { describe, expect, it } from "vitest";

import { snapshot } from "@modules/dex/data/snapshot.repository";
import type { TypeName } from "@modules/dex/domain/dex";
import { effectiveness } from "@modules/dex/domain/effectiveness";

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

describe("moves", () => {
  it("has no moves cut before Gen IX", () => {
    expect(snapshot.moves.map((m) => m.slug)).not.toContain("hidden-power");
  });
});
