import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

// Own module is expressed as `${from.module}`: the capture group of the element
// patterns below. That is what keeps `hangman/ui` out of `guess/domain`.
const ownModule = (type) => [type, { module: "${from.module}" }];

// Layers of a module. Folders for the ones that grow (domain, data, ui), single
// files at the module root for the ones that usually stay one file.
const layer = (type, pattern) => ({
  type,
  pattern: `src/modules/*/${pattern}`,
  mode: "full",
  capture: ["module"],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      // data/ is included so imports of the snapshot are checked too: outside
      // include, an import is invisible to every rule below.
      "boundaries/include": ["src/**/*.{ts,tsx}", "data/**/*.json"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**/*", mode: "full" },
        layer("module", "index.ts"),
        layer("domain", "domain/**/*"),
        layer("data", "data/**/*"),
        // A root-level file's test belongs to its layer, like the tests
        // inside domain/ and data/ do.
        layer("data", "*.repository?(.test).ts"),
        layer("service", "*.service?(.test).ts"),
        layer("schema", "*.schema?(.test).ts"),
        layer("ui", "ui/**/*"),
        { type: "shared", pattern: "src/shared/**/*", mode: "full" },
        // Every species, so every answer. Only dex/data may read it; anything
        // else goes through its server-only repository.
        { type: "snapshot", pattern: "data/*.json", mode: "full" },
      ],
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message: "${file.type} is not allowed to import ${dependency.type}",
          rules: [
            // Routing composes: modules through their public API, plus shared primitives.
            { from: ["app"], allow: ["app", "module", "shared"] },
            // A module's index.ts is the only file that sees all of its own
            // layers, and it reaches other modules through their index.ts only.
            {
              from: ["module"],
              allow: [
                "module",
                ownModule("domain"),
                ownModule("data"),
                ownModule("service"),
                ownModule("schema"),
                ownModule("ui"),
                "shared",
              ],
            },
            // Game rules: orchestrate domain and data. Knows neither HTTP nor
            // the concrete database, and may use another module's public API.
            {
              from: ["service"],
              allow: [
                "module",
                ownModule("service"),
                ownModule("domain"),
                ownModule("data"),
                ownModule("schema"),
                "shared",
              ],
            },
            { from: [["data", { module: "dex" }]], allow: ["snapshot"] },
            // I/O layer: SQL and file reads, mapped onto its own domain types.
            {
              from: ["data"],
              allow: [
                ownModule("data"),
                ownModule("domain"),
                ownModule("schema"),
                "shared",
              ],
            },
            // Zod for input and output, typed against the domain.
            {
              from: ["schema"],
              allow: [ownModule("schema"), ownModule("domain"), "shared"],
            },
            // Presentation: props in, markup out. No data access.
            {
              from: ["ui"],
              allow: [ownModule("ui"), ownModule("domain"), "shared"],
            },
            // Pure TypeScript. Depends on nothing but itself.
            { from: ["domain"], allow: [ownModule("domain")] },
            { from: ["shared"], allow: ["shared"] },
          ],
        },
      ],
      "boundaries/no-unknown": "error",
      "boundaries/no-unknown-files": "error",
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
