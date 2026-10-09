import { describe, expect, it, vi } from "vitest";

import { POST as dailyStartRoute } from "@app/api/daily/games/route";
import { POST as statsGuessRoute } from "@app/api/guess/games/[id]/guesses/route";
import { POST as statsStartRoute } from "@app/api/guess/games/route";
import { POST as guessRoute } from "@app/api/hangman/games/[id]/guesses/route";
import { POST as startRoute } from "@app/api/hangman/games/route";
import { getDaily } from "@modules/daily";
import { shuffle } from "@modules/daily/domain/daily";
import { POOL_V1 } from "@modules/daily/domain/pool";
import { findSpecies, snapshot, type Species } from "@modules/dex";
import { getGame as getStatsGame } from "@modules/guess";
import { getGame } from "@modules/hangman";

/*
 * The project's thesis as a test: play whole games through the route
 * handlers and check that no response before the last one carries the
 * answer, by name, slug or id. The database is an in-memory map behind the
 * repository's own interface, so everything above it runs for real.
 */

const jar = vi.hoisted(() => new Map<string, string>());
const games = vi.hoisted(
  () =>
    new Map<
      string,
      { playerId: string; speciesSlug: string; letters: string }
    >(),
);
const statsGames = vi.hoisted(
  () =>
    new Map<
      string,
      {
        playerId: string;
        speciesSlug: string;
        guesses: string[];
        puzzle?: number;
        closesAt: Date | null;
      }
    >(),
);
const pick = vi.hoisted(() => ({ index: 0 }));
// Launch is today, so today's puzzle is #1.
const TODAY = vi.hoisted(() => new Date().toISOString().slice(0, 10));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: ({ name, value }: { name: string; value: string }) =>
      jar.set(name, value),
  }),
}));
vi.mock("@shared/config/env", () => ({
  env: {
    COOKIE_SECRET: "c".repeat(32),
    DAILY_SECRET: "d".repeat(32),
    LAUNCH_DATE: TODAY,
    NODE_ENV: "test",
  },
}));
vi.mock("@shared/db/client", () => ({ sql: vi.fn() }));
vi.mock("node:crypto", async (original) => ({
  ...(await original<typeof import("node:crypto")>()),
  randomInt: () => pick.index,
}));
vi.mock("@modules/hangman/hangman.repository", () => ({
  createGame: async (playerId: string, speciesSlug: string) => {
    const id = crypto.randomUUID();
    games.set(id, { playerId, speciesSlug, letters: "" });
    return id;
  },
  findGame: async (id: string, playerId: string) => {
    const game = games.get(id);
    return game?.playerId === playerId ? { ...game } : undefined;
  },
  addLetter: async (
    id: string,
    playerId: string,
    letters: string,
    letter: string,
  ) => {
    const game = games.get(id);
    if (game?.playerId !== playerId || game.letters !== letters) return false;
    game.letters += letter;
    return true;
  },
}));
vi.mock("@modules/guess/guess.repository", () => ({
  createGame: async (playerId: string, speciesSlug: string) => {
    const id = crypto.randomUUID();
    statsGames.set(id, { playerId, speciesSlug, guesses: [], closesAt: null });
    return id;
  },
  findGame: async (id: string, playerId: string) => {
    const game = statsGames.get(id);
    return game?.playerId === playerId
      ? { ...game, guesses: [...game.guesses] }
      : undefined;
  },
  addGuess: async (
    id: string,
    playerId: string,
    count: number,
    slug: string,
  ) => {
    const game = statsGames.get(id);
    if (game?.playerId !== playerId || game.guesses.length !== count) {
      return false;
    }
    game.guesses.push(slug);
    return true;
  },
  // The unique key on (player, puzzle), as the table enforces it.
  createDailyGame: async (
    playerId: string,
    speciesSlug: string,
    puzzle: number,
    closesAt: Date,
  ) => {
    const taken = [...statsGames.values()].some(
      (game) => game.playerId === playerId && game.puzzle === puzzle,
    );
    if (!taken) {
      statsGames.set(crypto.randomUUID(), {
        playerId,
        speciesSlug,
        guesses: [],
        puzzle,
        closesAt,
      });
    }
  },
  findDailyGames: async (playerId: string) =>
    [...statsGames]
      .filter(([, game]) => game.playerId === playerId && game.puzzle)
      .map(([id, game]) => ({ id, ...game, guesses: [...game.guesses] })),
  findLeaderboard: async () => [],
}));

const post = (body?: object, type = "application/json") =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": type },
    body: body && JSON.stringify(body),
  });

// Stats & types shows the guesses' base stats, any of which may equal the
// answer's dex number by chance: those are skipped, every other number is not.
const numbersIn = (value: unknown): number[] =>
  typeof value === "number"
    ? [value]
    : value && typeof value === "object"
      ? Object.entries(value).flatMap(([key, inner]) =>
          key === "stats" ? [] : numbersIn(inner),
        )
      : [];

const objectsIn = (value: unknown): object[] =>
  value && typeof value === "object"
    ? [value, ...Object.values(value).flatMap(objectsIn)]
    : [];

function expectNoAnswer(responses: unknown[], species: Species) {
  for (const response of responses) {
    const text = JSON.stringify(response).toLowerCase();
    expect(response).not.toHaveProperty("answer");
    expect(text).not.toContain(species.name.toLowerCase());
    expect(text).not.toContain(species.slug);
    expect(numbersIn(response)).not.toContain(species.id);
    // The stat line alone, under any key, is the answer without its name.
    // The guesses below never share it (checked where they are picked).
    expect(objectsIn(response)).not.toContainEqual(species.stats);
  }
}

const modes = {
  hangman: { start: startRoute, guess: guessRoute, view: getGame },
  stats: {
    start: statsStartRoute,
    guess: statsGuessRoute,
    view: getStatsGame,
  },
  daily: {
    start: () => dailyStartRoute(post({ date: TODAY })),
    guess: statsGuessRoute,
    // All the daily page gets: the game, and nothing else until it is over.
    view: async (_id: string, playerId: string) => getDaily(playerId, 1),
  },
};

const playerOf = () => jar.get("player")!.split(".")[0]!;

/** Plays `bodies` in order until the game ends, collecting every response. */
async function play(
  mode: keyof typeof modes,
  slug: string,
  bodies: (answer: Species) => object[],
) {
  const { start, guess, view } = modes[mode];
  const species = findSpecies(slug)!;
  pick.index = snapshot.species.indexOf(species);
  jar.clear();

  const responses: unknown[] = [];
  const game = (await (await start(post())).json()) as { id: string };
  responses.push(game);

  for (const body of bodies(species)) {
    const response = await guess(post(body), {
      params: Promise.resolve({ id: game.id }),
    });
    expect(response.status).toBe(200);
    const next = (await response.json()) as { status: string };
    responses.push(next);
    if (next.status !== "playing") break;

    // What the page would hand the board mid-game: the same view.
    responses.push(await view(game.id, playerOf()));
  }
  return { species, game, responses };
}

const GAMES = [
  ["mr-mime", "won"],
  ["mr-mime", "lost"],
  ["flabebe", "won"],
  ["type-null", "lost"],
] as const;

const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const lettersOf = (name: string) => [
  ...new Set(fold(name).replace(/[^a-z]/g, "")),
];

const letters = (outcome: "won" | "lost") => (answer: Species) =>
  (outcome === "won"
    ? lettersOf(answer.name)
    : [..."abcdefghijklmnopqrstuvwxyz"].filter(
        (letter) => !lettersOf(answer.name).includes(letter),
      )
  ).map((letter) => ({ letter }));

describe("Hangman: no answer before the game is over", () => {
  it.each(GAMES)("%s, %s", async (slug, outcome) => {
    const { species, responses } = await play(
      "hangman",
      slug,
      letters(outcome),
    );
    const before = responses.slice(0, -1);

    expect(responses.at(-1)).toMatchObject({
      status: outcome,
      answer: species.name,
    });
    expectNoAnswer(before, species);
    for (const response of before) {
      // The mask is an array, so the name never appears in it as one string.
      expect((response as { mask: unknown[] }).mask).toContain(null);
    }
  });

  it("hides a game from any other player", async () => {
    const { game } = await play("hangman", "mr-mime", letters("won"));
    jar.clear();
    const response = await guessRoute(post({ letter: "a" }), {
      params: Promise.resolve({ id: game.id }),
    });
    expect(response.status).toBe(404);
  });

  it("refuses a cross-site form post before touching the game", async () => {
    jar.clear();
    const response = await startRoute(post(undefined, "text/plain"));
    expect(response.status).toBe(415);
    expect(jar.size).toBe(0);
  });
});

// The first species in dex order. A wrong guess shows its own name and
// stats, so none may contain an answer's name ("Mewtwo" contains "Mew") or
// share its stat line.
const WRONG = snapshot.species.slice(0, 9);

const guesses = (outcome: "won" | "lost") => (answer: Species) => {
  const misses = WRONG.filter((guess) => guess !== answer);
  expect(misses.map((guess) => guess.stats)).not.toContainEqual(answer.stats);
  return (outcome === "won" ? [...misses.slice(0, 3), answer] : misses).map(
    (guess) => ({ species: guess.name }),
  );
};

describe("Stats & types: no answer before the game is over", () => {
  it.each(GAMES)("%s, %s", async (slug, outcome) => {
    const { species: answer, responses } = await play(
      "stats",
      slug,
      guesses(outcome),
    );

    expect(responses.at(-1)).toMatchObject({
      status: outcome,
      answer: { name: answer.name, stats: answer.stats },
    });
    expectNoAnswer(responses.slice(0, -1), answer);
  });

  it("refuses an unknown species without spending a guess", async () => {
    jar.clear();
    const started = await statsStartRoute(post());
    const game = (await started.json()) as { id: string; remaining: number };
    const response = await statsGuessRoute(post({ species: "Missingno" }), {
      params: Promise.resolve({ id: game.id }),
    });
    expect(response.status).toBe(400);
    expect(await getStatsGame(game.id, playerOf())).toMatchObject({
      remaining: game.remaining,
    });
  });

  it("hides a game from any other player", async () => {
    const { game } = await play("stats", "mr-mime", guesses("won"));
    jar.clear();
    const response = await statsGuessRoute(post({ species: "Bulbasaur" }), {
      params: Promise.resolve({ id: game.id }),
    });
    expect(response.status).toBe(404);
  });
});

// Puzzle #1 under the test secret. Not Bulbasaur, whose dex number is 1.
const DAILY = shuffle(POOL_V1, "d".repeat(32), "v1")[1]!;

describe("Daily puzzle: no answer before the game is over", () => {
  it.each(["won", "lost"] as const)("%s", async (outcome) => {
    const { species: answer, responses } = await play(
      "daily",
      DAILY,
      guesses(outcome),
    );

    expect(responses.at(-1)).toMatchObject({
      status: outcome,
      answer: { name: answer.name, stats: answer.stats },
    });
    expectNoAnswer(responses.slice(0, -1), answer);
  });

  it("takes no guess once the puzzle has closed everywhere", async () => {
    const { game } = await play("daily", DAILY, () => []);
    statsGames.get(game.id)!.closesAt = new Date(Date.now() - 1);
    const response = await statsGuessRoute(post({ species: "Bulbasaur" }), {
      params: Promise.resolve({ id: game.id }),
    });
    expect(response.status).toBe(409);
    expect(await getDaily(playerOf(), 1)).toMatchObject({
      game: { status: "lost", rows: [] },
      streak: { current: 0 },
    });
  });

  it("gives the same game to a second start", async () => {
    const { game } = await play("daily", DAILY, () => []);
    const again = await dailyStartRoute(post({ date: TODAY }));
    expect(await again.json()).toMatchObject({ id: game.id });
  });

  it("refuses a date that is today nowhere", async () => {
    jar.clear();
    const response = await dailyStartRoute(post({ date: "2000-01-01" }));
    expect(response.status).toBe(400);
    expect(jar.size).toBe(0);
  });
});
