import type { Metadata } from "next";
import Link from "next/link";

import { runTeam, TeamForm, TeamReport } from "@modules/team";

export const metadata: Metadata = {
  title: "Team builder · Type Matrix",
  description: "Shared weaknesses and STAB coverage for a team of up to six.",
};

export default async function TeamPage({ searchParams }: PageProps<"/team">) {
  const { result, ...form } = runTeam(await searchParams);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-sm text-muted underline">
          ← Type Matrix
        </Link>
        <h1 className="text-3xl font-bold">Team builder</h1>
        <p className="text-muted">
          Up to six species, one of each. Types only: abilities, held items and
          Terastallization are not modelled.
        </p>
      </header>
      <TeamForm {...form} />
      <TeamReport result={result} errors={form.errors} />
    </main>
  );
}
