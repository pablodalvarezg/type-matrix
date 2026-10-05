interface DamageResultProps {
  result: {
    attacker: string;
    defender: string;
    move: { name: string; type: string; category: string; power: number };
    rolls: number[];
    minPercent: number;
    maxPercent: number;
    stab: boolean;
    effectiveness: number;
    defenderHp: number;
    critical: boolean;
    burned: boolean;
  } | null;
}

/** Always rendered, so screen readers announce each new result. */
export function DamageResult({ result }: DamageResultProps) {
  return (
    <section
      aria-live="polite"
      aria-labelledby="result-heading"
      className="flex flex-col gap-3 border border-muted bg-surface p-4"
    >
      <h2 id="result-heading" className="font-bold">
        Result
      </h2>
      {result ? (
        <Breakdown result={result} />
      ) : (
        <p className="text-muted">Pick an attacker, a defender and a move.</p>
      )}
    </section>
  );
}

function Breakdown({
  result,
}: {
  result: NonNullable<DamageResultProps["result"]>;
}) {
  const { move, rolls } = result;
  const min = Math.min(...rolls);
  const max = Math.max(...rolls);

  return (
    <>
      <p>
        {result.attacker}&apos;s {move.name} against {result.defender}
      </p>
      <p className="text-2xl font-bold tabular-nums">
        {min}–{max}{" "}
        <span className="text-base font-normal text-muted">
          of {result.defenderHp} HP
        </span>
      </p>
      <p className="tabular-nums">
        {result.minPercent}% – {result.maxPercent}% of its HP
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
        <dt className="text-muted">Move</dt>
        <dd>
          <span className="capitalize">{move.type}</span>, {move.category},
          power {move.power}
        </dd>
        <dt className="text-muted">Type</dt>
        <dd className="tabular-nums">
          ×{result.effectiveness} {effectivenessLabel(result.effectiveness)}
        </dd>
        <dt className="text-muted">STAB</dt>
        <dd>{result.stab ? "Yes, ×1.5" : "No"}</dd>
        {result.critical && (
          <>
            <dt className="text-muted">Critical</dt>
            <dd>Yes, ×1.5</dd>
          </>
        )}
        {result.burned && (
          <>
            <dt className="text-muted">Burn</dt>
            <dd>Halves physical damage</dd>
          </>
        )}
      </dl>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm text-muted">All 16 rolls</h3>
        <ol className="flex flex-wrap gap-x-3 text-sm tabular-nums">
          {rolls.map((roll, index) => (
            <li key={index}>{roll}</li>
          ))}
        </ol>
      </div>
    </>
  );
}

function effectivenessLabel(multiplier: number): string {
  if (multiplier === 0) return "(no effect)";
  if (multiplier < 1) return "(not very effective)";
  if (multiplier > 1) return "(super effective)";
  return "(neutral)";
}
