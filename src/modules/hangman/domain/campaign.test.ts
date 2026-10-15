import { describe, expect, it } from "vitest";

import {
  campaign,
  canPick,
  WINS_PER_GEN,
} from "@modules/hangman/domain/campaign";

const GENS = 9;
const wins = (n: number) => Array<boolean>(n).fill(true);

describe("campaign", () => {
  it("starts at Gen I with nothing finished", () => {
    expect(campaign([], GENS)).toEqual({ completed: 0, wins: 0, current: 1 });
  });

  it("finishes a generation on its tenth win", () => {
    expect(campaign(wins(WINS_PER_GEN - 1), GENS)).toEqual({
      completed: 0,
      wins: 9,
      current: 1,
    });
    expect(campaign(wins(WINS_PER_GEN), GENS)).toEqual({
      completed: 1,
      wins: 0,
      current: 2,
    });
  });

  it("takes a win back for each loss, never below zero", () => {
    expect(campaign([true, true, true, false], GENS).wins).toBe(2);
    expect(campaign([false, false, true], GENS).wins).toBe(1);
  });

  it("never takes a finished generation back", () => {
    const result = campaign([...wins(WINS_PER_GEN), false, false], GENS);
    expect(result).toEqual({ completed: 1, wins: 0, current: 2 });
  });

  it("ends once every generation is finished", () => {
    const done = campaign([...wins(WINS_PER_GEN * GENS), false], GENS);
    expect(done).toEqual({ completed: GENS, wins: 0, current: null });
  });
});

describe("canPick", () => {
  const at = (current: number | null) => ({ completed: 0, wins: 0, current });

  it("always allows every species", () => {
    expect(canPick([], at(1), GENS)).toBe(true);
  });

  it("allows one finished generation while the campaign runs", () => {
    expect(canPick([2], at(3), GENS)).toBe(true);
    expect(canPick([3], at(3), GENS)).toBe(false);
    expect(canPick([1, 2], at(3), GENS)).toBe(false);
  });

  it("allows any set once the campaign is done", () => {
    expect(canPick([1, 5, 9], at(null), GENS)).toBe(true);
    expect(canPick([10], at(null), GENS)).toBe(false);
  });
});
