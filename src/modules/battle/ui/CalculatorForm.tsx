import Form from "next/form";

import { Pill } from "@modules/battle/ui/Pill";
import { SideFields } from "@modules/battle/ui/SideFields";
import { Combobox } from "@shared/ui/Combobox";

interface CalculatorFormProps {
  values: Record<string, string | undefined>;
  errors: Record<string, string>;
  speciesNames: string[];
  moveNames: string[];
}

/*
 * A GET form: the URL is the whole state, so a calculation can be shared by
 * its link. next/form submits it as a client-side navigation; `replace` keeps
 * each recalculation out of the back button's history.
 */
export function CalculatorForm({
  values,
  errors,
  speciesNames,
  moveNames,
}: CalculatorFormProps) {
  return (
    <Form
      action="/calculator"
      replace
      scroll={false}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(["attacker", "defender"] as const).map((side) => (
          <SideFields
            key={side}
            side={side}
            values={values}
            errors={errors}
            speciesNames={speciesNames}
          />
        ))}
      </div>

      <fieldset className="flex flex-col gap-4 border border-muted bg-surface p-4">
        <legend className="px-1 font-bold">Move</legend>
        <Combobox
          name="move"
          label="Move"
          options={moveNames}
          defaultValue={values.move}
          error={errors.move}
          placeholder={
            moveNames.length > 0
              ? `${moveNames.length} damaging moves`
              : "Pick an attacker first"
          }
        />
        <div>
          <Pill
            type="checkbox"
            name="critical"
            label="Critical hit"
            defaultChecked={values.critical !== undefined}
          />
        </div>
      </fieldset>

      <button
        type="submit"
        className="self-start border border-foreground bg-foreground px-4 py-2 font-bold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Calculate
      </button>
    </Form>
  );
}
