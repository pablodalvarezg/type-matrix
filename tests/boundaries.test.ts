import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/*
 * The boundary rules can pass without checking a single import: Atlas lost
 * them twice, once to a blocked `unrs-resolver` install script and once to an
 * import of a path that does not exist, which resolves to nothing and is never
 * checked. Both leave `npm run lint` green.
 *
 * So these fixtures are virtual files at real layer paths, importing a file
 * that does exist. If the resolver breaks, the forbidden import stops erroring
 * and this test goes red.
 */
const eslint = new ESLint();
const realImport = `import { parseEnv } from "@shared/config/env-schema";\nexport const x = parseEnv;\n`;

async function boundaryErrors(filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(realImport, { filePath });
  return (result?.messages ?? [])
    .map((m) => m.ruleId ?? "")
    .filter((id) => id.startsWith("boundaries/"));
}

describe("boundaries", () => {
  it("forbids domain from importing shared", async () => {
    expect(await boundaryErrors("src/modules/fixture/domain/leak.ts")).toEqual([
      "boundaries/element-types",
    ]);
  });

  it("allows ui to import shared", async () => {
    expect(await boundaryErrors("src/modules/fixture/ui/View.tsx")).toEqual([]);
  });

  it.each([
    "src/modules/fixture/index.ts",
    "src/modules/fixture/fixture.service.ts",
    "src/modules/fixture/fixture.repository.ts",
    "src/modules/fixture/data/fixture-repository.ts",
    "src/modules/fixture/fixture.schema.ts",
  ])("recognises %s as a layer that may use shared", async (filePath) => {
    expect(await boundaryErrors(filePath)).toEqual([]);
  });

  it("rejects a module file that belongs to no layer", async () => {
    expect(await boundaryErrors("src/modules/fixture/helpers.ts")).toContain(
      "boundaries/no-unknown-files",
    );
  });
}, 60_000);
