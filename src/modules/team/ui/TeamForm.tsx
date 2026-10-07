import Form from "next/form";

import { Combobox } from "@shared/ui/Combobox";

interface TeamFormProps {
  values: Record<string, string | undefined>;
  errors: Record<string, string>;
  speciesNames: string[];
}

const SLOTS = [1, 2, 3, 4, 5, 6];

/*
 * A GET form like the calculator's: the URL is the team, so a team can be
 * shared by its link. Picking a suggestion submits it.
 */
export function TeamForm({ values, errors, speciesNames }: TeamFormProps) {
  return (
    <Form action="/team" replace scroll={false} className="flex flex-col gap-4">
      <fieldset className="grid gap-4 border border-muted bg-surface p-4 sm:grid-cols-2 md:grid-cols-3">
        <legend className="px-1 font-bold">Team</legend>
        {SLOTS.map((slot) => {
          const name = `member.${slot}`;
          return (
            <Combobox
              key={name}
              name={name}
              label={`Member ${slot}`}
              options={speciesNames}
              defaultValue={values[name]}
              error={errors[name]}
              placeholder="Empty slot"
            />
          );
        })}
      </fieldset>

      <button
        type="submit"
        className="self-start border border-foreground bg-foreground px-4 py-2 font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Analyze
      </button>
    </Form>
  );
}
