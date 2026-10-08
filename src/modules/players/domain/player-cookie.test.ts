import { describe, expect, it } from "vitest";

import {
  signPlayerId,
  verifyPlayerCookie,
} from "@modules/players/domain/player-cookie";

const SECRET = "a".repeat(32);
const ID = "3f2b8c1e-5d4a-4e6f-9b7c-0a1d2e3f4a5b";

describe("player cookie", () => {
  it("gives back the id it signed", () => {
    expect(verifyPlayerCookie(signPlayerId(ID, SECRET), SECRET)).toBe(ID);
  });

  it("rejects another id under a valid signature", () => {
    const [, signature] = signPlayerId(ID, SECRET).split(".");
    const forged = `${ID.replace("3", "4")}.${signature}`;
    expect(verifyPlayerCookie(forged, SECRET)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    expect(
      verifyPlayerCookie(`${signPlayerId(ID, SECRET)}x`, SECRET),
    ).toBeNull();
  });

  it("rejects a cookie signed with another secret", () => {
    expect(
      verifyPlayerCookie(signPlayerId(ID, "b".repeat(32)), SECRET),
    ).toBeNull();
  });

  it.each(["", ID, `${ID}.`, `.${ID}`, `${signPlayerId(ID, SECRET)}.extra`])(
    "rejects the malformed cookie %j",
    (cookie) => {
      expect(verifyPlayerCookie(cookie, SECRET)).toBeNull();
    },
  );
});
