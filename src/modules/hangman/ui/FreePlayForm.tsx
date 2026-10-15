import { NewGameButton } from "@shared/ui/NewGameButton";
import { Pill } from "@shared/ui/Pill";

/**
 * A new free-play game. While the campaign runs, one of the generations it
 * finished, or every species; once it is done, any set of them, where none
 * checked is every species. The button sends what is checked.
 */
export function FreePlayForm({
  names,
  completed,
  campaignDone,
}: {
  /** Every generation's name, Gen I first. */
  names: string[];
  completed: number;
  campaignDone: boolean;
}) {
  const unlocked = names.slice(0, completed);
  return (
    // Not a <form>: one with no submit handler could be sent as a GET.
    <div data-game-options className="flex flex-col gap-4">
      {campaignDone ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-muted">
            Generations (none checked is every species)
          </legend>
          <div className="flex flex-wrap gap-2">
            {names.map((name, index) => (
              <Pill
                key={name}
                type="checkbox"
                name="gen"
                value={String(index + 1)}
                label={name}
              />
            ))}
          </div>
        </fieldset>
      ) : unlocked.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-muted">Species from</legend>
          <div className="flex flex-wrap gap-2">
            <Pill type="radio" name="gen" value="" label="All" defaultChecked />
            {unlocked.map((name, index) => (
              <Pill
                key={name}
                type="radio"
                name="gen"
                value={String(index + 1)}
                label={name}
              />
            ))}
          </div>
        </fieldset>
      ) : null}
      {!campaignDone && (
        <p className="text-sm text-muted">
          {unlocked.length > 0
            ? "Finish more generations in the campaign to pick them here. Finish them all to mix them."
            : "Every species, at random. Finish a generation in the campaign to play only that one."}
        </p>
      )}
      <NewGameButton mode="hangman" label="New game" />
    </div>
  );
}
