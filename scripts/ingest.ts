/*
 * Builds data/snapshot.json from PokéAPI. Run by hand (`npm run ingest`), never
 * at runtime: the app reads only the committed snapshot, and re-running this is
 * a decision whose diff shows exactly what changed.
 *
 * Self-contained on purpose: Node runs this file directly by stripping types,
 * which does not resolve the app's path aliases. The snapshot's own schema
 * lives in the dex module, and its test is what checks this script's output.
 */
import { writeFile } from "node:fs/promises";
import { z } from "zod";

const API = "https://pokeapi.co/api/v2";
const CONCURRENCY = 6; // PokéAPI asks consumers to be polite; ~2,800 calls.
const OUTPUT = new URL("../data/snapshot.json", import.meta.url);

const TYPE_NAMES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
] as const;

/*
 * Learnsets come from the most recent mainline game a species appears in.
 * Scarlet/Violet first, because the battle mechanics are Gen IX; older tiers
 * only for species that game left out. Spin-offs with their own battle
 * systems (Legends, Colosseum, Let's Go, Champions) are not tiers.
 * PokéAPI's version-group ids are not chronological, hence the explicit list.
 * TODO(pablo): species absent from Scarlet/Violet keep an older learnset.
 */
const LEARNSET_TIERS = [
  ["scarlet-violet", "the-teal-mask", "the-indigo-disk"],
  ["sword-shield", "the-isle-of-armor", "the-crown-tundra"],
  ["brilliant-diamond-shining-pearl"],
  ["ultra-sun-ultra-moon"],
  ["sun-moon"],
  ["omega-ruby-alpha-sapphire"],
  ["x-y"],
];
const GEN_IX_TIER = LEARNSET_TIERS[0]!;

const named = z.object({ name: z.string() });
const englishName = (names: { name: string; language: { name: string } }[]) =>
  names.find((n) => n.language.name === "en")?.name;

const speciesList = z.object({ results: z.array(named) });

const speciesSchema = z.object({
  id: z.number().int(),
  names: z.array(z.object({ name: z.string(), language: named })),
  varieties: z.array(z.object({ is_default: z.boolean(), pokemon: named })),
});

const pokemonSchema = z.object({
  types: z.array(z.object({ slot: z.number(), type: named })),
  stats: z.array(z.object({ base_stat: z.number().int(), stat: named })),
  moves: z.array(
    z.object({
      move: named,
      version_group_details: z.array(z.object({ version_group: named })),
    }),
  ),
});

const moveSchema = z.object({
  name: z.string(),
  names: z.array(z.object({ name: z.string(), language: named })),
  type: named,
  damage_class: named,
  power: z.number().int().nullable(),
});

const typeSchema = z.object({
  damage_relations: z.object({
    double_damage_to: z.array(named),
    half_damage_to: z.array(named),
    no_damage_to: z.array(named),
  }),
});

const STAT_KEYS: Record<string, string> = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};

async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const url = `${API}/${path}`;
  // One retry, only for transient failures: a 404 is a real answer.
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url).catch(() => null);
    if (response?.ok) return schema.parse(await response.json());
    const transient =
      !response || response.status >= 500 || response.status === 429;
    if (!transient || attempt === 2) {
      throw new Error(
        `GET ${url} failed: ${response?.status ?? "network error"}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

/** Maps with at most CONCURRENCY requests in flight, keeping input order. */
async function pool<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]!);
      if (++done % 100 === 0) console.log(`  ${done}/${items.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

type LearnedMove = z.infer<typeof pokemonSchema>["moves"][number];

const learnedIn = (move: LearnedMove, tier: string[]) =>
  move.version_group_details.some((d) => tier.includes(d.version_group.name));

function learnset(moves: LearnedMove[]): string[] {
  for (const tier of LEARNSET_TIERS) {
    const learned = moves
      .filter((m) => learnedIn(m, tier))
      .map((m) => m.move.name);
    if (learned.length > 0) return learned;
  }
  return [];
}

async function main() {
  const { results } = await get("pokemon-species?limit=10000", speciesList);
  console.log(`species: ${results.length}`);

  const raw = await pool(results, async ({ name }) => {
    const species = await get(`pokemon-species/${name}`, speciesSchema);
    const variety = species.varieties.find((v) => v.is_default)!.pokemon.name;
    const pokemon = await get(`pokemon/${variety}`, pokemonSchema);
    return { species, slug: name, pokemon };
  });

  // A move exists in Gen IX if any species learns it in Scarlet/Violet. That
  // drops Max Moves, Z-Moves and moves cut since Gen VIII without a list.
  const genIxMoves = new Set(
    raw.flatMap(({ pokemon }) =>
      pokemon.moves
        .filter((m) => learnedIn(m, GEN_IX_TIER))
        .map((m) => m.move.name),
    ),
  );

  const learnsets = raw.map(({ pokemon }) =>
    learnset(pokemon.moves).filter((move) => genIxMoves.has(move)),
  );

  const candidates = [...new Set(learnsets.flat())].sort();
  console.log(`moves: ${candidates.length} candidates`);
  const fetchedMoves = await pool(candidates, (move) =>
    get(`move/${move}`, moveSchema),
  );

  // Damaging moves with a fixed power. Variable-power moves need inputs v1
  // does not model, so they are left out: PokéAPI gives them a null power
  // (Low Kick, Gyro Ball) or, for Hard Press, a power of 0.
  // TODO(pablo): variable-power moves.
  const moves = fetchedMoves
    .filter((m) => m.damage_class.name !== "status" && (m.power ?? 0) > 0)
    .map((m) => ({
      slug: m.name,
      name: englishName(m.names) ?? m.name,
      type: m.type.name,
      category: m.damage_class.name,
      power: m.power,
    }));
  const kept = new Set(moves.map((m) => m.slug));

  const species = raw.map(({ species, slug, pokemon }, i) => ({
    id: species.id,
    slug,
    name: englishName(species.names) ?? slug,
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name),
    stats: Object.fromEntries(
      Object.entries(STAT_KEYS).map(([api, key]) => [
        key,
        pokemon.stats.find((s) => s.stat.name === api)!.base_stat,
      ]),
    ),
    moves: learnsets[i]!.filter((move) => kept.has(move)).sort(),
  }));

  const typeChart = Object.fromEntries(
    await pool([...TYPE_NAMES], async (type) => {
      const { damage_relations: r } = await get(`type/${type}`, typeSchema);
      const multipliers: Record<string, number> = {};
      for (const t of r.double_damage_to) multipliers[t.name] = 2;
      for (const t of r.half_damage_to) multipliers[t.name] = 0.5;
      for (const t of r.no_damage_to) multipliers[t.name] = 0;
      return [type, sortKeys(multipliers)] as const;
    }),
  );

  // One entry per line: a re-ingest diffs species by species.
  const lines = (items: unknown[]) =>
    items.map((item) => `    ${JSON.stringify(item)}`).join(",\n");
  const chartLines = Object.entries(typeChart)
    .map(
      ([type, multipliers]) =>
        `    ${JSON.stringify(type)}: ${JSON.stringify(multipliers)}`,
    )
    .join(",\n");
  const json = [
    "{",
    `  "typeChart": {\n${chartLines}\n  },`,
    `  "moves": [\n${lines(moves)}\n  ],`,
    `  "species": [\n${lines(species.sort((a, b) => a.id - b.id))}\n  ]`,
    "}",
    "",
  ].join("\n");
  await writeFile(OUTPUT, json);

  const fallback = raw.filter(
    ({ pokemon }) => !pokemon.moves.some((m) => learnedIn(m, GEN_IX_TIER)),
  );
  console.log(
    `wrote ${species.length} species, ${moves.length} moves, ${Object.keys(typeChart).length} types` +
      ` (${(json.length / 1024).toFixed(0)} KB); ${fallback.length} species use a pre-Gen IX learnset`,
  );
}

function sortKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
  );
}

await main();
