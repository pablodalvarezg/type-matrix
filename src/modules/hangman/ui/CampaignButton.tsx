import type { Campaign } from "@modules/hangman/domain/campaign";
import { NewGameButton } from "@shared/ui/NewGameButton";

/** The next campaign game, in the generation being played; none once done. */
export function CampaignButton({
  campaign: { current },
  names,
}: {
  campaign: Campaign;
  /** Every generation's name, Gen I first. */
  names: string[];
}) {
  if (current === null) return null;
  return (
    <NewGameButton
      mode="hangman"
      body={{ campaign: true }}
      label={`Play ${names[current - 1]}`}
    />
  );
}
