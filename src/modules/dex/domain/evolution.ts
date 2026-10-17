interface Link {
  slug: string;
  evolvesFrom: string | null;
}

/**
 * Each species' evolution stage: 1 for one that evolves from nothing, one
 * more than its pre-evolution otherwise. Pichu 1, Pikachu 2, Raichu 3.
 */
export function stages(species: Link[]): Map<string, number> {
  const from = new Map(species.map((s) => [s.slug, s.evolvesFrom]));
  const result = new Map<string, number>();
  const stageOf = (slug: string): number => {
    const known = result.get(slug);
    if (known) return known;
    if (!from.has(slug)) throw new Error(`Unknown species ${slug}`);
    const parent = from.get(slug);
    const stage = parent ? stageOf(parent) + 1 : 1;
    result.set(slug, stage);
    return stage;
  };
  for (const { slug } of species) stageOf(slug);
  return result;
}
