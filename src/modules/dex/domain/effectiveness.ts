import type { TypeChart, TypeName } from "@modules/dex/domain/dex";

/**
 * Multiplier of an attack against a defender: the product over the defender's
 * types, so dual types stack (×4, ×0.25) and any immunity makes it 0.
 */
export function effectiveness(
  chart: TypeChart,
  attack: TypeName,
  defender: readonly TypeName[],
): number {
  return defender.reduce(
    (multiplier, type) => multiplier * (chart[attack][type] ?? 1),
    1,
  );
}
