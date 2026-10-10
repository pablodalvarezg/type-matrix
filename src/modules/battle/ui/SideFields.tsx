import {
  MAX_IV,
  MAX_LEVEL,
  STAT_NAMES,
  type StatName,
} from "@modules/battle/domain/stats";
import { NumberField } from "@modules/battle/ui/NumberField";
import { Pill } from "@modules/battle/ui/Pill";
import { Combobox } from "@shared/ui/Combobox";

const STAT_LABELS: Record<StatName, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

interface SideFieldsProps {
  side: "attacker" | "defender";
  values: Record<string, string | undefined>;
  errors: Record<string, string>;
  speciesNames: string[];
}

/** Species, level, nature, IVs and EVs of one side of the matchup. */
export function SideFields({
  side,
  values,
  errors,
  speciesNames,
}: SideFieldsProps) {
  const field = (path: string) => `${side}.${path}`;
  const errorId = (path: string) =>
    errors[field(path)] ? `${field(path)}-error` : undefined;

  // IV and EV errors are listed under the grid, one line each.
  const spreadErrors = Object.entries(errors).filter(
    ([name]) => name.startsWith(field("ivs")) || name.startsWith(field("evs")),
  );

  return (
    <fieldset className="flex min-w-0 flex-col gap-4 border border-muted bg-surface p-4">
      <legend className="px-1 font-bold capitalize">{side}</legend>

      <Combobox
        name={field("species")}
        label="Species"
        options={speciesNames}
        defaultValue={values[field("species")]}
        error={errors[field("species")]}
        placeholder="Search a species"
      />

      <div className="w-24">
        <NumberField
          name={field("level")}
          label="Level"
          defaultValue={values[field("level")] ?? String(MAX_LEVEL)}
          errorId={errorId("level")}
        />
        <FieldError id={errorId("level")} message={errors[field("level")]} />
      </div>

      {(["up", "down"] as const).map((direction) => (
        <fieldset key={direction} className="flex flex-col gap-1">
          <legend className="text-sm text-muted">
            Nature {direction === "up" ? "raises (×1.1)" : "lowers (×0.9)"}
          </legend>
          <div className="flex flex-wrap gap-1">
            {(["", "atk", "def", "spa", "spd", "spe"] as const).map((stat) => (
              <Pill
                key={stat}
                type="radio"
                name={field(direction)}
                value={stat}
                label={stat ? STAT_LABELS[stat] : "None"}
                defaultChecked={(values[field(direction)] ?? "") === stat}
              />
            ))}
          </div>
          <FieldError
            id={errorId(direction)}
            message={errors[field(direction)]}
          />
        </fieldset>
      ))}

      {/* Block, not flex: a flex <details> does not animate its content. */}
      <details open={spreadErrors.length > 0}>
        <summary className="text-sm text-muted">IVs and EVs</summary>
        <div className="mt-4 grid grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-1">
          <span />
          {STAT_NAMES.map((stat) => (
            <span
              key={stat}
              aria-hidden
              className="text-center text-sm text-muted"
            >
              {STAT_LABELS[stat]}
            </span>
          ))}
          {(["ivs", "evs"] as const).map((kind) => (
            <SpreadRow
              key={kind}
              kind={kind}
              field={field}
              values={values}
              errorId={errorId}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-col text-sm">
          {spreadErrors.map(([name, message]) => (
            <li key={name} id={`${name}-error`}>
              ✕ {describeSpreadField(name)}: {message}
            </li>
          ))}
        </ul>
      </details>

      {side === "attacker" && (
        <div>
          <Pill
            type="checkbox"
            name={field("burned")}
            label="Burned"
            defaultChecked={values[field("burned")] !== undefined}
          />
        </div>
      )}
    </fieldset>
  );
}

function SpreadRow({
  kind,
  field,
  values,
  errorId,
}: {
  kind: "ivs" | "evs";
  field: (path: string) => string;
  values: Record<string, string | undefined>;
  errorId: (path: string) => string | undefined;
}) {
  const label = kind === "ivs" ? "IV" : "EV";
  return (
    <>
      <span aria-hidden className="pr-1 text-sm text-muted">
        {label}
      </span>
      {STAT_NAMES.map((stat) => {
        const path = `${kind}.${stat}`;
        return (
          <NumberField
            key={stat}
            name={field(path)}
            label={`${STAT_LABELS[stat]} ${label}`}
            hideLabel
            defaultValue={
              values[field(path)] ?? String(kind === "ivs" ? MAX_IV : 0)
            }
            // The EV total error belongs to every EV field.
            errorId={
              errorId(path) ?? (kind === "evs" ? errorId("evs") : undefined)
            }
          />
        );
      })}
    </>
  );
}

// "attacker.evs.spa" → "SpA EV"; "attacker.evs" → "EVs".
function describeSpreadField(name: string): string {
  const [, kind, stat] = name.split(".");
  const label = kind === "ivs" ? "IV" : "EV";
  return stat ? `${STAT_LABELS[stat as StatName]} ${label}` : `${label}s`;
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!id || !message) return null;
  return (
    <p id={id} className="text-sm">
      ✕ {message}
    </p>
  );
}
