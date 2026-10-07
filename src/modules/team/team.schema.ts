import { z } from "zod";

import { param, type SearchParams } from "@shared/search-params";

/** The form's fields, one per slot: member.1 … member.6. */
export const MEMBER_FIELDS = [1, 2, 3, 4, 5, 6].map((slot) => `member.${slot}`);

// A blank slot is an empty one, like a missing param.
const member = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

export interface MemberQuery {
  field: string;
  query: string | undefined;
}

/** What was typed in each slot, in slot order. */
export function parseTeam(params: SearchParams): MemberQuery[] {
  return MEMBER_FIELDS.map((field) => ({
    field,
    query: member.parse(param(params, field)),
  }));
}
