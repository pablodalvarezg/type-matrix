import { z } from "zod";

import { TYPE_NAMES, type Snapshot } from "@modules/dex/domain/dex";

/*
 * The snapshot is ours and committed, but it is written by a script that reads
 * someone else's API. Parsing it here makes a bad ingest fail at load, in one
 * place, instead of as an `undefined` deep inside a damage calculation.
 */
const typeName = z.enum(TYPE_NAMES);
const baseStat = z.number().int().positive();

const snapshotSchema = z.object({
  typeChart: z.record(typeName, z.partialRecord(typeName, z.number().min(0))),
  moves: z.array(
    z.object({
      slug: z.string().min(1),
      name: z.string().min(1),
      type: typeName,
      category: z.enum(["physical", "special"]),
      power: z.number().int().positive(),
    }),
  ),
  species: z.array(
    z.object({
      id: z.number().int().positive(),
      slug: z.string().min(1),
      name: z.string().min(1),
      types: z.union([z.tuple([typeName]), z.tuple([typeName, typeName])]),
      stats: z.object({
        hp: baseStat,
        atk: baseStat,
        def: baseStat,
        spa: baseStat,
        spd: baseStat,
        spe: baseStat,
      }),
      moves: z.array(z.string().min(1)),
    }),
  ),
});

export function parseSnapshot(raw: unknown): Snapshot {
  return snapshotSchema.parse(raw);
}
