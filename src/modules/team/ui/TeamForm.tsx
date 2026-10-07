import Form from "next/form";

import { Combobox } from "@shared/ui/Combobox";

interface TeamFormProps {
  values: Record<string, string | undefined>;
  errors: Record<string, string>;
  speciesNames: string[];
}

/*
 * A GET form like the calculator's: the URL is the team, so a team can be
 * shared by its link. Picking a suggestion submits it. The slots are the keys
 * of `values`, which the service fills from the schema's field list.
 */
export function TeamForm({ values, errors, speciesNames }: TeamFormProps) {
  return (
    <Form action="/team" replace scroll={false} className="flex flex-col gap-4">
      <fieldset className="grid gap-4 border border-muted bg-surface p-4 sm:grid-cols-2 md:grid-cols-3">
        <legend className="px-1 font-bold">Team</legend>
        {Object.keys(values).map((name, index) => (
          <Combobox
            key={name}
            name={name}
            label={`Member ${index + 1}`}
            options={speciesNames}
            defaultValue={values[name]}
            error={errors[name]}
            placeholder="Empty slot"
          />
        ))}
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
