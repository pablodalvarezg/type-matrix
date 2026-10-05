import type { Metadata } from "next";
import Link from "next/link";

import { CalculatorForm, DamageResult, runCalculator } from "@modules/battle";

export const metadata: Metadata = {
  title: "Battle calculator · Type Matrix",
  description: "Damage range for any matchup, with Gen IX formulas.",
};

export default async function CalculatorPage({
  searchParams,
}: PageProps<"/calculator">) {
  const { result, ...form } = runCalculator(await searchParams);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Battle calculator</h1>
        <p className="text-muted">
          Gen IX, singles. Not modelled yet: abilities, held items, weather,
          terrain, Terastallization, stat changes, and moves with rules of their
          own (Psyshock, Body Press, Foul Play, Facade…). Those moves get the
          plain formula, so their numbers are off.
          {/* TODO(pablo): drop the moves list once the ingest leaves them out. */}
        </p>
      </header>
      <CalculatorForm {...form} />
      <DamageResult result={result} />
    </main>
  );
}
