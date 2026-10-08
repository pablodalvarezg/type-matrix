import { describe, expect, it } from "vitest";

import { nicknameSchema } from "@modules/players/players.schema";

describe("nickname", () => {
  it.each(["Ash", "red_01", "Blue-Oak", "a".repeat(16)])(
    "accepts %j",
    (name) => {
      expect(nicknameSchema.safeParse(name).success).toBe(true);
    },
  );

  it("trims before checking", () => {
    expect(nicknameSchema.parse("  Ash  ")).toBe("Ash");
  });

  it.each(["ab", "a".repeat(17), "Ash Ketchum", "Flabébé", "ash!", "", 42])(
    "rejects %j",
    (name) => {
      expect(nicknameSchema.safeParse(name).success).toBe(false);
    },
  );
});
