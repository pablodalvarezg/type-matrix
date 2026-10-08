import { NeonDbError } from "@neondatabase/serverless";
import { describe, expect, it, vi } from "vitest";

import { setNickname } from "@modules/players/players.repository";

const sql = vi.hoisted(() => vi.fn());
vi.mock("@shared/db/client", () => ({ sql }));

const ID = "3f2b8c1e-5d4a-4e6f-9b7c-0a1d2e3f4a5b";

const uniqueViolation = (constraint: string) =>
  Object.assign(new NeonDbError("duplicate key"), {
    code: "23505",
    constraint,
  });

describe("setNickname", () => {
  it("saves", async () => {
    sql.mockResolvedValueOnce([]);
    expect(await setNickname(ID, "Ash")).toBe(true);
  });

  it("reports a nickname another player has", async () => {
    sql.mockRejectedValueOnce(uniqueViolation("players_nickname_key"));
    expect(await setNickname(ID, "Ash")).toBe(false);
  });

  it("rethrows a clash on any other constraint", async () => {
    const error = uniqueViolation("players_other_key");
    sql.mockRejectedValueOnce(error);
    await expect(setNickname(ID, "Ash")).rejects.toBe(error);
  });
});
