export interface Card {
  slug: string;
  name: string;
  types: string[];
  stats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  total: number;
}

const LABELS = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
] as const;

/** A species as the draft weighs it: its types and base stats. */
export function SpeciesCard({ species }: { species: Card }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="font-bold">{species.name}</span>
      <span className="text-sm text-muted">
        <span className="capitalize">{species.types.join(" / ")}</span> ·{" "}
        {species.total} total
      </span>
      <span className="flex flex-wrap gap-x-3 text-xs tabular-nums">
        {LABELS.map(([key, label]) => (
          <span key={key}>
            {label} {species.stats[key]}
          </span>
        ))}
      </span>
    </span>
  );
}
