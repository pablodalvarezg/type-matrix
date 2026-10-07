import {
  effectiveness,
  findSpecies,
  snapshot,
  TYPE_NAMES,
  type Species,
} from "@modules/dex";

import {
  analyzeTeam,
  dualTypes,
  type TeamAnalysis,
} from "@modules/team/domain/team";
import { MEMBER_FIELDS, parseTeam } from "@modules/team/team.schema";
import { param, type SearchParams } from "@shared/search-params";

/*
 * Like the calculator, nothing here is secret: it runs on the server because
 * that is where the snapshot lives.
 */

export interface TeamResult extends TeamAnalysis {
  members: Pick<Species, "name" | "types">[];
}

export interface TeamView {
  /** The raw value of each slot, to fill the form back in. */
  values: Record<string, string | undefined>;
  /** Error message by field name. */
  errors: Record<string, string>;
  /** Every species name: the search space, safe to send to the browser. */
  speciesNames: string[];
  result: TeamResult | null;
}

const speciesNames = snapshot.species.map((species) => species.name);
const dualDefenders = dualTypes(
  TYPE_NAMES,
  snapshot.species.map((species) => species.types),
);

export function runTeam(params: SearchParams): TeamView {
  const errors: Record<string, string> = {};
  const members: Species[] = [];
  for (const { field, query } of parseTeam(params)) {
    if (!query) continue;
    const species = findSpecies(query);
    if (!species) errors[field] = `No species called "${query}"`;
    // One of each, like the Species Clause.
    else if (members.some((member) => member.id === species.id))
      errors[field] = `${species.name} is already on the team`;
    else members.push(species);
  }

  const view = {
    values: Object.fromEntries(
      MEMBER_FIELDS.map((field) => [field, param(params, field)]),
    ),
    errors,
    speciesNames,
  };
  if (members.length === 0 || Object.keys(errors).length > 0) {
    return { ...view, result: null };
  }

  return {
    ...view,
    result: {
      ...analyzeTeam({
        multiplier: (attack, defender) =>
          effectiveness(snapshot.typeChart, attack, defender),
        types: TYPE_NAMES,
        members: members.map((member) => member.types),
        dualDefenders,
      }),
      members: members.map(({ name, types }) => ({ name, types })),
    },
  };
}
