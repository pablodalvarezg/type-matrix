import { createHmac } from "node:crypto";

import {
  battle,
  canBattle,
  type Battle,
  type BattleEvent,
} from "@modules/battle";
import {
  createRun,
  findRun,
  findRuns,
  saveDraft,
  type RunRow,
} from "@modules/battler/battler.repository";
import { runId } from "@modules/battler/battler.schema";
import {
  bracket,
  BRACKET_SIZE,
  draw,
  DIFFICULTIES,
  inPool,
  offers,
  RIVAL_NAMES,
  rivalTeam,
  RULES,
  TEAM_SIZE,
  type Candidate,
  type Difficulty,
} from "@modules/battler/domain/draft";
import {
  evolves,
  findSpecies,
  snapshot,
  type BaseStats,
  type Species,
} from "@modules/dex";

/*
 * A run is its row: every offer, rival and battle is drawn again from its
 * seed on each read, so nothing derived is stored. The seed never leaves
 * the server; nor do the offers to come or, until the team is ordered, the
 * rivals.
 */

/**
 * [0, 1) draws for one purpose of one run: HMAC of the seed over the
 * purpose and a counter, so each purpose replays alone.
 */
const stream = (seed: string, purpose: string) => {
  let n = 0;
  return () =>
    createHmac("sha256", seed)
      .update(`${purpose}:${n++}`)
      .digest()
      .readUInt32BE(0) /
    2 ** 32;
};

const totalOf = (stats: BaseStats) =>
  Object.values(stats).reduce((sum, stat) => sum + stat, 0);

// Every species with a move a battle uses: all but the 11 without a fixed-
// power damaging move.
const candidates: Candidate[] = snapshot.species.filter(canBattle).map((s) => ({
  slug: s.slug,
  total: totalOf(s.stats),
  evolves: evolves(s.slug),
}));
const pools = Object.fromEntries(
  DIFFICULTIES.map((d) => [d, candidates.filter((c) => inPool(d, c))]),
) as Record<Difficulty, Candidate[]>;

// Stored slugs come from the snapshot. A re-ingest that dropped a species
// would break its old runs here, loudly.
const speciesOf = (slug: string): Species => findSpecies(slug)!;

/** A species as the draft shows it. */
export interface Card {
  slug: string;
  name: string;
  types: string[];
  stats: BaseStats;
  total: number;
}

const card = (slug: string): Card => {
  const { name, types, stats } = speciesOf(slug);
  return { slug, name, types, stats, total: totalOf(stats) };
};

type Stage = "draft" | "order" | "bracket";

const stageOf = (run: RunRow): Stage =>
  run.ordered ? "bracket" : run.picks.length < TEAM_SIZE ? "draft" : "order";

const offersOf = (run: RunRow) =>
  offers(
    pools[run.difficulty],
    run.picks,
    RULES[run.difficulty].offers,
    stream(run.seed, `offer:${run.picks.length}:${run.rerolls}`),
  ).map((c) => c.slug);

interface Entrant {
  name: string;
  you: boolean;
  members: string[];
}

export interface TeamView {
  name: string;
  you: boolean;
  /** As the team came into the match, and whether each fainted in it. */
  members: { name: string; fainted: boolean }[];
}

export interface MatchView {
  teams: [TeamView, TeamView];
  winner: 0 | 1;
  decidedBy: Battle["decidedBy"];
  events: BattleEvent[];
}

/**
 * The run's bracket: the player in a seat the seed picks, seven named
 * rivals drafted from the same pool. In a Nuzlocke, whoever of the player's team
 * faints is gone for the rounds after.
 */
function tournament(run: RunRow): MatchView[][] {
  const { deaths } = RULES[run.difficulty];
  const names = draw(RIVAL_NAMES, BRACKET_SIZE - 1, stream(run.seed, "names"));
  const entrants: Entrant[] = Array.from(
    { length: BRACKET_SIZE - 1 },
    (_, i) => ({
      name: names[i]!,
      you: false,
      members: rivalTeam(
        pools[run.difficulty],
        run.difficulty,
        stream(run.seed, `rival:${i}`),
      ),
    }),
  );
  const seat = Math.floor(stream(run.seed, "seat")() * BRACKET_SIZE);
  entrants.splice(seat, 0, { name: "You", you: true, members: run.picks });

  const rounds = bracket(entrants, (teams, round, index) => {
    const result = battle(
      [teams[0].members.map(speciesOf), teams[1].members.map(speciesOf)],
      stream(run.seed, `match:${round}:${index}`),
    );
    const winner = teams[result.winner];
    const alive = winner.members.filter(
      (_, i) => result.hp[result.winner][i]! > 0,
    );
    return {
      winner: result.winner,
      next: deaths && winner.you ? { ...winner, members: alive } : winner,
      result,
    };
  });

  return rounds.map((matches) =>
    matches.map(({ teams, winner, result }) => ({
      teams: [0, 1].map((side) => ({
        name: teams[side]!.name,
        you: teams[side]!.you,
        members: teams[side]!.members.map((slug, i) => ({
          name: speciesOf(slug).name,
          fainted: result.hp[side]![i] === 0,
        })),
      })) as [TeamView, TeamView],
      winner,
      decidedBy: result.decidedBy,
      events: result.events,
    })),
  );
}

/** Matches the player won: one per round is the title. */
const winsOf = (rounds: MatchView[][]) =>
  rounds.flat().filter((match) => match.teams[match.winner].you).length;

/** Everything a response or a page may carry. */
export interface RunView {
  id: string;
  difficulty: Difficulty;
  stage: Stage;
  picks: Card[];
  /** The pick's offers while drafting; empty after. */
  offers: Card[];
  rerollsLeft: number;
  /** Once the team is ordered. */
  rounds?: MatchView[][];
  wins?: number;
}

function view(run: RunRow): RunView {
  const stage = stageOf(run);
  const rounds = stage === "bracket" ? tournament(run) : undefined;
  return {
    id: run.id,
    difficulty: run.difficulty,
    stage,
    picks: run.picks.map(card),
    offers: stage === "draft" ? offersOf(run).map(card) : [],
    rerollsLeft: RULES[run.difficulty].rerolls - run.rerolls,
    ...(rounds && { rounds, wins: winsOf(rounds) }),
  };
}

// The player's own run. A malformed id is a miss here, not an SQL error.
const load = async (id: string, playerId: string) =>
  runId.safeParse(id).success ? findRun(id, playerId) : undefined;

/**
 * The last run of each difficulty, if its team is not ordered yet: one open
 * at a time, so an unlucky draft cannot be dropped for a fresh one.
 * ponytail: an older open run lost a race between two starts; it stays
 * playable by its id, which is harmless here.
 */
const openOf = (runs: RunRow[], difficulty: Difficulty) => {
  const last = runs.filter((run) => run.difficulty === difficulty).at(-1);
  return last && !last.ordered ? last : undefined;
};

/**
 * The Nuzlocke opens with a title on hard.
 * ponytail: replays every finished hard run, seven battles each; store the
 * result if a heavy player's page ever gets slow.
 */
const nuzlockeOpen = (runs: RunRow[]) =>
  runs.some((run) => {
    if (run.difficulty !== "hard" || !run.ordered) return false;
    const rounds = tournament(run);
    return winsOf(rounds) === rounds.length;
  });

/** What the mode's page shows. A visitor without a cookie has no runs. */
export async function getOverview(playerId: string | undefined) {
  const runs = playerId ? await findRuns(playerId) : [];
  return {
    open: Object.fromEntries(
      DIFFICULTIES.map((d) => [d, openOf(runs, d)?.id]),
    ) as Record<Difficulty, string | undefined>,
    nuzlocke: nuzlockeOpen(runs),
  };
}

export type StartError = "locked";

/** The open run of that difficulty, or a new one. */
export async function startRun(
  playerId: string,
  difficulty: Difficulty,
): Promise<RunView | StartError> {
  const runs = await findRuns(playerId);
  const open = openOf(runs, difficulty);
  if (open) return view(open);
  if (difficulty === "nuzlocke" && !nuzlockeOpen(runs)) return "locked";
  return view(await createRun(playerId, difficulty));
}

export async function getRun(
  id: string,
  playerId: string,
): Promise<RunView | undefined> {
  const run = await load(id, playerId);
  return run && view(run);
}

export type DraftError =
  | "not-found"
  | "over"
  | "not-offered"
  | "no-rerolls"
  | "not-your-team"
  | "conflict";

async function change(
  id: string,
  playerId: string,
  stage: Stage,
  next: (
    run: RunRow,
  ) => Omit<RunRow, "id" | "difficulty" | "seed"> | DraftError,
): Promise<RunView | DraftError> {
  const run = await load(id, playerId);
  if (!run) return "not-found";
  if (stageOf(run) !== stage) return "over";
  const changed = next(run);
  if (typeof changed === "string") return changed;
  if (!(await saveDraft(run, playerId, changed))) return "conflict";
  return view({ ...run, ...changed });
}

/** Takes one of the offers. A Nuzlocke team fights in pick order. */
export const pick = (id: string, playerId: string, slug: string) =>
  change(id, playerId, "draft", (run) => {
    if (!offersOf(run).includes(slug)) return "not-offered";
    const picks = [...run.picks, slug];
    return {
      ...run,
      picks,
      ordered: run.difficulty === "nuzlocke" && picks.length === TEAM_SIZE,
    };
  });

/** Swaps every offer of this pick for new ones. */
export const reroll = (id: string, playerId: string) =>
  change(id, playerId, "draft", (run) =>
    run.rerolls >= RULES[run.difficulty].rerolls
      ? "no-rerolls"
      : { ...run, rerolls: run.rerolls + 1 },
  );

/** The team's fighting order; the bracket is played from here. */
export const order = (id: string, playerId: string, slugs: string[]) =>
  change(id, playerId, "order", (run) =>
    [...slugs].sort().join() !== [...run.picks].sort().join()
      ? "not-your-team"
      : { ...run, picks: slugs, ordered: true },
  );
