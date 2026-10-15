// The last national dex number of each generation, I to IX. The snapshot
// holds default forms only, so a species' id is its national dex number.
const LAST_IDS = [151, 251, 386, 493, 649, 721, 809, 905, 1025] as const;

export const GENERATIONS = LAST_IDS.length;

/** 1 for Bulbasaur, 9 for Pecharunt. */
export function generationOf(id: number): number {
  const index = LAST_IDS.findIndex((last) => id <= last);
  if (index === -1) throw new Error(`No generation for dex number ${id}`);
  return index + 1;
}

/** "Gen I" to "Gen IX"; generation n is at n - 1. */
export const GENERATION_NAMES = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
].map((roman) => `Gen ${roman}`);
