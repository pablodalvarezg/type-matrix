import { z } from "zod";

/** A page's search params, as Next hands them over. */
export type SearchParams = Record<string, string | string[] | undefined>;

/** The first value of a search param, as a repeated key yields an array. */
export function param(params: SearchParams, name: string): string | undefined {
  const value = params[name];
  return Array.isArray(value) ? value[0] : value;
}

/** A free-text field, trimmed; blank counts as missing. */
export const textParam = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);
