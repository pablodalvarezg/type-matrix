export {
  TYPE_NAMES,
  type BaseStats,
  type Move,
  type Snapshot,
  type Species,
  type StatName,
  type TypeChart,
  type TypeName,
} from "@modules/dex/domain/dex";
export { effectiveness } from "@modules/dex/domain/effectiveness";
export {
  GENERATION_NAMES,
  GENERATIONS,
  generationOf,
} from "@modules/dex/domain/generations";
export {
  findMove,
  findSpecies,
  snapshot,
  evolves,
  stageOf,
} from "@modules/dex/data/snapshot.repository";
