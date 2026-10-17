/**
 * A name's shape as Hangman and Dex Clues both say it: "7 letters", or
 * "2 + 4 letters, with a space". Each mode's domain counts the parts.
 */
export const describeShape = ({
  parts,
  joiner,
}: {
  parts: number[];
  joiner?: "space" | "hyphen";
}) => `${parts.join(" + ")} letters${joiner ? `, with a ${joiner}` : ""}`;
