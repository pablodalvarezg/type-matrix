import { describe, expect, it, vi } from "vitest";

import { signPlayerId } from "@modules/players/domain/player-cookie";
import { identify } from "@modules/players/players.service";

// vi.mock runs before the imports, so the secret it uses must be hoisted too.
const SECRET = vi.hoisted(() => "c".repeat(32));
vi.mock("@shared/config/env", () => ({
  env: { COOKIE_SECRET: SECRET, NODE_ENV: "production" },
}));

const ID = "3f2b8c1e-5d4a-4e6f-9b7c-0a1d2e3f4a5b";

describe("identify", () => {
  it("keeps the player of a valid cookie and sends it back", () => {
    const cookie = signPlayerId(ID, SECRET);
    expect(identify(cookie)).toMatchObject({
      id: ID,
      cookie: { value: cookie },
    });
  });

  it.each([undefined, "", signPlayerId(ID, "d".repeat(32))])(
    "makes a new player out of %j",
    (cookie) => {
      const { id, cookie: issued } = identify(cookie);
      expect(id).not.toBe(ID);
      expect(issued.value).toBe(signPlayerId(id, SECRET));
    },
  );

  it("issues a cookie scripts and other sites cannot read", () => {
    expect(identify(undefined).cookie).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  });
});
