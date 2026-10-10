interface CoverageRow {
  defender: readonly string[];
  best: number;
}

interface TeamReportProps {
  result: {
    members: { name: string; types: readonly string[] }[];
    weaknesses: {
      attack: string;
      weak: number;
      resist: number;
      immune: number;
      warning: boolean;
    }[];
    coverage: CoverageRow[];
    holes: CoverageRow[];
  } | null;
  errors: Record<string, string>;
}

const typing = (types: readonly string[]) => types.join("/");
const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function summary({ result, errors }: TeamReportProps): string {
  if (Object.keys(errors).length > 0) {
    return "Fix the fields marked ✕ to see the analysis.";
  }
  if (!result) return "Add at least one species to the team.";
  const warnings = result.weaknesses.filter((row) => row.warning).length;
  return `${count(warnings, "shared weakness", "shared weaknesses")}, ${count(result.holes.length, "dual-type gap", "dual-type gaps")}.`;
}

export function TeamReport(props: TeamReportProps) {
  return (
    <section
      aria-labelledby="report-heading"
      className="flex flex-col gap-6 border border-muted bg-surface p-4"
    >
      <h2 id="report-heading" className="font-bold">
        Analysis
      </h2>
      {/* Always rendered and short: the live region announces each new
          analysis with one line, not every cell of the tables. */}
      <p aria-live="polite" className={props.result ? undefined : "text-muted"}>
        {summary(props)}
      </p>
      {props.result && (
        <Report
          key={props.result.members.map((member) => member.name).join()}
          result={props.result}
        />
      )}
    </section>
  );
}

function Report({
  result,
}: {
  result: NonNullable<TeamReportProps["result"]>;
}) {
  return (
    <div className="flex animate-pop flex-col gap-6">
      <ul className="flex flex-wrap gap-x-4 text-sm">
        {result.members.map((member) => (
          <li key={member.name}>
            {member.name}{" "}
            <span className="text-muted capitalize">
              {typing(member.types)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 overflow-x-auto">
        <h3 className="font-bold">Shared weaknesses</h3>
        <p className="text-sm text-muted">
          Members hit by each attacking type. ! marks two or more weak and
          nobody to switch in.
        </p>
        <table className="text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="pr-4 font-normal">
                Attack
              </th>
              <th scope="col" className="pr-4 text-right font-normal">
                Weak ×2+
              </th>
              <th scope="col" className="pr-4 text-right font-normal">
                Resist
              </th>
              <th scope="col" className="pr-4 text-right font-normal">
                Immune
              </th>
              <th scope="col" className="font-normal">
                Warning
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {result.weaknesses.map((row) => (
              <tr key={row.attack} className={row.warning ? "font-bold" : ""}>
                <th
                  scope="row"
                  className="pr-4 text-left font-normal capitalize"
                >
                  {row.attack}
                </th>
                <td className="pr-4 text-right">{row.weak}</td>
                <td className="pr-4 text-right">{row.resist}</td>
                <td className="pr-4 text-right">{row.immune}</td>
                <td>{row.warning ? "! Shared weakness" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 overflow-x-auto">
        <h3 className="font-bold">STAB coverage</h3>
        <p className="text-sm text-muted">
          Best multiplier the team&apos;s own types reach against each type.
          Moves are not counted yet.
        </p>
        <table className="text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="pr-4 font-normal">
                Defender
              </th>
              <th scope="col" className="pr-4 text-right font-normal">
                Best
              </th>
              <th scope="col" className="font-normal">
                Gap
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {result.coverage.map((row) => (
              <tr key={typing(row.defender)}>
                <th
                  scope="row"
                  className="pr-4 text-left font-normal capitalize"
                >
                  {typing(row.defender)}
                </th>
                <td className="pr-4 text-right">×{row.best}</td>
                <td>{row.best <= 1 ? "– not super effective" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-bold">Dual-type gaps ({result.holes.length})</h3>
        {result.holes.length > 0 ? (
          <>
            <p className="text-sm text-muted">
              Type pairs some species has, which no STAB type hits for more than
              ×1.
            </p>
            <ul className="flex flex-wrap gap-x-4 text-sm tabular-nums">
              {result.holes.map((row) => (
                <li key={typing(row.defender)} className="capitalize">
                  {typing(row.defender)} ×{row.best}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm">
            None: every type pair some species has takes more than ×1 from a
            STAB type.
          </p>
        )}
      </div>
    </div>
  );
}
