/*
 * The Battler's draft and bracket (decided by Pablo on 2026-10-14 and
 * 2026-10-16). Every draw takes a `random` in [0, 1): the service seeds it,
 * so a tournament replays the same from its row.
 */

export const DIFFICULTIES = ["easy", "hard", "nuzlocke"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const TEAM_SIZE = 6;
export const BRACKET_SIZE = 8;

/**
 * Offers per pick, rerolls per draft, and whether rivals draft too. A
 * drafting rival takes the best of RIVAL_OFFERS by base-stat total; on easy
 * rivals are random. A Nuzlocke team also loses for good whoever faints.
 */
export const RULES: Record<
  Difficulty,
  { offers: number; rerolls: number; rivalsDraft: boolean; deaths: boolean }
> = {
  easy: { offers: 6, rerolls: 6, rivalsDraft: false, deaths: false },
  hard: { offers: 3, rerolls: 3, rivalsDraft: true, deaths: false },
  nuzlocke: { offers: 3, rerolls: 0, rivalsDraft: true, deaths: true },
};

export const RIVAL_OFFERS = 3;

/**
 * The rivals, named like gym leaders but our own, so no character of the
 * games is borrowed (decided by Pablo on 2026-10-17). Each tournament draws
 * seven. TODO(pablo): the names are placeholders; change them at will.
 */
export const RIVAL_NAMES = [
  "Cinder",
  "Marlow",
  "Sable",
  "Quill",
  "Tamsin",
  "Orrin",
  "Vesna",
  "Hollis",
  "Brannock",
  "Linnea",
  "Dorian",
  "Isolde",
  "Caspian",
  "Mireille",
  "Thaddeus",
  "Ondine",
  "Bastian",
  "Wren",
  "Calder",
  "Seraphine",
].map((name) => `Leader ${name}`);

/** The Nuzlocke pool: species that evolve no further, with this total or more. */
export const NUZLOCKE_MIN_TOTAL = 450;

export interface Candidate {
  slug: string;
  /** Base-stat total. */
  total: number;
  evolves: boolean;
}

export const inPool = (difficulty: Difficulty, candidate: Candidate) =>
  difficulty !== "nuzlocke" ||
  (!candidate.evolves && candidate.total >= NUZLOCKE_MIN_TOTAL);

/** `count` distinct items, in draw order. */
export function draw<T>(items: T[], count: number, random: () => number): T[] {
  const rest = [...items];
  const drawn: T[] = [];
  while (drawn.length < count && rest.length > 0) {
    drawn.push(rest.splice(Math.floor(random() * rest.length), 1)[0]!);
  }
  return drawn;
}

/** A pick's offers: none of them already on the team. */
export const offers = (
  pool: Candidate[],
  picks: string[],
  count: number,
  random: () => number,
) =>
  draw(
    pool.filter((c) => !picks.includes(c.slug)),
    count,
    random,
  );

/** A rival's six, in the order it drafted them. */
export function rivalTeam(
  pool: Candidate[],
  difficulty: Difficulty,
  random: () => number,
): string[] {
  if (!RULES[difficulty].rivalsDraft) {
    return draw(pool, TEAM_SIZE, random).map((c) => c.slug);
  }
  const team: string[] = [];
  while (team.length < TEAM_SIZE) {
    const best = offers(pool, team, RIVAL_OFFERS, random).reduce((a, b) =>
      b.total > a.total ? b : a,
    );
    team.push(best.slug);
  }
  return team;
}

export interface Match<T, R> {
  teams: [T, T];
  winner: 0 | 1;
  result: R;
}

/**
 * A single-elimination bracket, first against second, third against
 * fourth… `play` gives the winner and the team as it goes on: a Nuzlocke
 * team without the fighters it lost.
 */
export function bracket<T, R>(
  entrants: T[],
  play: (
    teams: [T, T],
    round: number,
    index: number,
  ) => { winner: 0 | 1; next: T; result: R },
): Match<T, R>[][] {
  const rounds: Match<T, R>[][] = [];
  let left = entrants;
  while (left.length > 1) {
    const round = rounds.length;
    const matches = Array.from({ length: left.length / 2 }, (_, index) => {
      const teams: [T, T] = [left[2 * index]!, left[2 * index + 1]!];
      return { teams, ...play(teams, round, index) };
    });
    rounds.push(
      matches.map(({ teams, winner, result }) => ({ teams, winner, result })),
    );
    left = matches.map((match) => match.next);
  }
  return rounds;
}
