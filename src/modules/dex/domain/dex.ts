export const TYPE_NAMES = [
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

export type TypeName = (typeof TYPE_NAMES)[number];

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type StatName = keyof BaseStats;

export interface Species {
  id: number;
  slug: string;
  /** English display name, as written: "Mr. Mime", "Nidoran♀", "Flabébé". */
  name: string;
  types: [TypeName] | [TypeName, TypeName];
  stats: BaseStats;
  /** Slugs of the damaging moves it can learn. See scripts/ingest.ts for which game. */
  moves: string[];
}

export interface Move {
  slug: string;
  name: string;
  type: TypeName;
  category: "physical" | "special";
  power: number;
}

/**
 * Attacking type → defending type → multiplier. Only the non-neutral pairs
 * are listed; a missing pair is ×1.
 */
export type TypeChart = Record<TypeName, Partial<Record<TypeName, number>>>;

export interface Snapshot {
  typeChart: TypeChart;
  moves: Move[];
  species: Species[];
}
