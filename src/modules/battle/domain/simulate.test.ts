import { describe, expect, it } from "vitest";

import {
  simulate,
  type BattleMove,
  type Effectiveness,
  type Battle,
  type Fighter,
  type Hit,
} from "@modules/battle/domain/simulate";

// Hand-made fighters: these tests check the turn logic, not the damage
// numbers, which damage.test.ts checks against the reference calculator.
const move = (
  name: string,
  type: string,
  power: number,
  accuracy: number | null = 100,
): BattleMove => ({ name, type, category: "physical", power, accuracy });

const fighter = (
  name: string,
  { spe = 100, hp = 150, atk = 100 } = {},
  moves = [move("Tackle", "normal", 40)],
  types = ["normal"],
): Fighter => ({
  name,
  types,
  stats: { hp, atk, def: 100, spa: 100, spd: 100, spe },
  moves,
});

const neutral: Effectiveness = () => 1;
// Normal and ghost hit nothing of the other.
const ghostChart: Effectiveness = (type, defender) =>
  (type === "normal" && defender.includes("ghost")) ||
  (type === "ghost" && defender.includes("normal"))
    ? 0
    : 1;

/** Never misses, never crits, lowest roll, and side 0 wins a speed tie. */
const low = () => 0;

const hits = (battle: Battle) =>
  battle.events.filter((event): event is Hit => event.kind === "hit");

describe("simulate", () => {
  it("lets the faster side hit first, and a knocked-out fighter not move", () => {
    const sweeper = fighter("Sweeper", { spe: 120, atk: 400 }, [
      move("Strong", "normal", 150),
    ]);
    const battle = simulate(
      [[sweeper], [fighter("Slow", { spe: 50, hp: 60 })]],
      neutral,
      low,
    );
    expect(hits(battle)).toHaveLength(1);
    expect(hits(battle)[0]).toMatchObject({
      side: 0,
      attacker: "Sweeper",
      fainted: true,
    });
    expect(battle).toMatchObject({ winner: 0, decidedBy: "ko" });
    expect(battle.hp[1]).toEqual([0]);
  });

  it("sends in the next fighter, in team order, after a knockout", () => {
    const sweeper = fighter("Sweeper", { spe: 120, atk: 400 }, [
      move("Strong", "normal", 150),
    ]);
    const battle = simulate(
      [
        [sweeper],
        [fighter("First", { hp: 60 }), fighter("Second", { hp: 60 })],
      ],
      neutral,
      low,
    );
    expect(hits(battle).map((hit) => hit.defender)).toEqual([
      "First",
      "Second",
    ]);
    expect(battle.winner).toBe(0);
  });

  it("replays the same battle from the same random draws", () => {
    const seeded = () => {
      let state = 7;
      return () => (state = (state * 16807) % 2147483647) / 2147483647;
    };
    const teams: [Fighter[], Fighter[]] = [
      [fighter("A"), fighter("B", { spe: 90 })],
      [fighter("C"), fighter("D", { spe: 110 })],
    ];
    expect(simulate(teams, neutral, seeded())).toEqual(
      simulate(teams, neutral, seeded()),
    );
  });

  it("misses when the draw is over the move's accuracy", () => {
    const shaky = fighter("Shaky", { spe: 120 }, [
      move("Shaky", "normal", 40, 50),
    ]);
    // 0.6 × 100 is over 50: a miss. Swift-like moves never miss.
    const battle = simulate([[shaky], [fighter("Target")]], neutral, () => 0.6);
    expect(hits(battle)[0]).toMatchObject({ damage: null, percent: 0 });

    const sure = fighter("Sure", { spe: 120 }, [
      move("Sure", "normal", 40, null),
    ]);
    const hit = hits(
      simulate([[sure], [fighter("Target")]], neutral, () => 0.6),
    )[0]!;
    expect(hit.damage).toBeGreaterThan(0);
  });

  it("weighs a move's power by its accuracy", () => {
    const choosy = fighter(
      "Choosy",
      { spe: 120 },
      [move("Wild", "water", 110, 80), move("Steady", "water", 90)],
      ["water"],
    );
    const battle = simulate([[choosy], [fighter("Target")]], neutral, low);
    expect(hits(battle)[0]!.move).toBe("Steady");
  });

  it("skips a move the defender is immune to, and hits with another", () => {
    const mixed = fighter("Mixed", { spe: 120 }, [
      move("Tackle", "normal", 120),
      move("Lick", "ghost", 30),
    ]);
    const ghost = fighter("Ghost", {}, [move("Lick", "ghost", 30)], ["ghost"]);
    const battle = simulate([[mixed], [ghost]], ghostChart, low);
    expect(hits(battle)[0]!.move).toBe("Lick");
  });

  it("gives a stalemate to the side with more of its HP left", () => {
    // Bait chips the ghost and faints to it; then neither the normal fighter
    // left nor the ghost can hurt the other. Side 0 keeps one full fighter,
    // side 1 less than one.
    const bait = fighter(
      "Bait",
      { hp: 40 },
      [move("Ember", "fire", 10)],
      ["fire"],
    );
    const ghost = fighter(
      "Ghost",
      { atk: 300 },
      [move("Lick", "ghost", 30)],
      ["ghost"],
    );
    const battle = simulate(
      [[bait, fighter("Normal")], [ghost]],
      ghostChart,
      low,
    );
    expect(battle).toMatchObject({ decidedBy: "hp", winner: 0 });
    expect(battle.hp[0]).toEqual([0, 150]);
    expect(battle.hp[1][0]).toBeLessThan(150);
  });

  it("tries every pairing of the fighters left before the HP decides", () => {
    // NormalA and GhostB cannot hurt each other, nor GhostA and NormalB; the
    // crossed pairings can. Rotating both sides at once never reaches them.
    const one = (name: string, type: string) =>
      fighter(name, {}, [move(`${type} move`, type, 60)], [type]);
    const battle = simulate(
      [
        [one("NormalA", "normal"), one("GhostA", "ghost")],
        [one("GhostB", "ghost"), one("NormalB", "normal")],
      ],
      ghostChart,
      low,
    );
    expect(battle.decidedBy).toBe("ko");
    expect(battle.events[0]).toMatchObject({ kind: "swap", side: 1 });
  });

  it("sends a fighter that cannot hurt the other to the back of the line", () => {
    // The normal lead and the ghost cannot hurt each other; the fire fighter
    // behind the lead can, so the lead goes to the back and fire comes in.
    const ghost = fighter("Ghost", {}, [move("Lick", "ghost", 30)], ["ghost"]);
    const fire = fighter(
      "Fire",
      { atk: 400 },
      [move("Ember", "fire", 40)],
      ["fire"],
    );
    const battle = simulate(
      [[fighter("Normal"), fire], [ghost]],
      ghostChart,
      low,
    );
    expect(battle.events[0]).toEqual({
      kind: "swap",
      side: 0,
      out: "Normal",
      in: "Fire",
    });
    expect(battle).toMatchObject({ decidedBy: "ko", winner: 0 });
    expect(battle.hp[1]).toEqual([0]);
  });
});
