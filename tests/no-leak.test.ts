import { describe, expect, it, vi } from "vitest";

import { POST as guessRoute } from "@app/api/hangman/games/[id]/guesses/route";
import { POST as startRoute } from "@app/api/hangman/games/route";
import { findSpecies, snapshot } from "@modules/dex";
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
const pick = vi.hoisted(() => ({ index: 0 }));

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
  env: { COOKIE_SECRET: "c".repeat(32), NODE_ENV: "test" },
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

const post = (body?: object, type = "application/json") =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": type },
    body: body && JSON.stringify(body),
  });

const numbersIn = (value: unknown): number[] =>
  typeof value === "number"
    ? [value]
    : value && typeof value === "object"
      ? Object.values(value).flatMap(numbersIn)
      : [];

const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const lettersOf = (name: string) => [
  ...new Set(fold(name).replace(/[^a-z]/g, "")),
];

async function play(slug: string, outcome: "won" | "lost") {
  const species = findSpecies(slug)!;
  pick.index = snapshot.species.indexOf(species);
  jar.clear();

  const responses: unknown[] = [];
  const started = await startRoute(post());
  const game = (await started.json()) as { id: string };
  responses.push(game);

  const letters =
    outcome === "won"
      ? lettersOf(species.name)
      : [..."abcdefghijklmnopqrstuvwxyz"].filter(
          (letter) => !lettersOf(species.name).includes(letter),
        );
  for (const letter of letters) {
    const response = await guessRoute(post({ letter }), {
      params: Promise.resolve({ id: game.id }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    responses.push(body);
    if (body.status !== "playing") break;

    // What the page would hand the board mid-game: the same view.
    const playerId = jar.get("player")!.split(".")[0]!;
    responses.push(await getGame(game.id, playerId));
  }
  return { species, game, responses };
}

describe("no answer before the game is over", () => {
  it.each([
    ["mr-mime", "won"],
    ["mr-mime", "lost"],
    ["flabebe", "won"],
    ["type-null", "lost"],
  ] as const)("%s, %s", async (slug, outcome) => {
    const { species, responses } = await play(slug, outcome);
    const last = responses.at(-1);
    const before = responses.slice(0, -1);

    expect(last).toMatchObject({ status: outcome, answer: species.name });
    for (const response of before) {
      const text = JSON.stringify(response).toLowerCase();
      expect(response).not.toHaveProperty("answer");
      // The mask is an array, so the name never appears in it as one string.
      expect((response as { mask: unknown[] }).mask).toContain(null);
      expect(text).not.toContain(species.name.toLowerCase());
      expect(text).not.toContain(species.slug);
      expect(numbersIn(response)).not.toContain(species.id);
    }
  });

  it("hides a game from any other player", async () => {
    const { game } = await play("mr-mime", "won");
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
