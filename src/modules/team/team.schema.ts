import { param, textParam, type SearchParams } from "@shared/search-params";

/** The form's fields, one per slot: member.1 … member.6. */
export const MEMBER_FIELDS = [1, 2, 3, 4, 5, 6].map((slot) => `member.${slot}`);

/** What was typed in each slot, in slot order; a blank slot is empty. */
export function parseTeam(params: SearchParams) {
  return MEMBER_FIELDS.map((field) => ({
    field,
    query: textParam.parse(param(params, field)),
  }));
}
