import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Aliases are duplicated from tsconfig.json rather than pulled in with a
  // plugin: three lines beat another dependency. Everything else is Vitest's
  // default — node environment and the standard test glob, which already covers
  // .test.tsx for when ui/ arrives.
  resolve: {
    alias: {
      "@app": src("./src/app"),
      "@modules": src("./src/modules"),
      "@shared": src("./src/shared"),
    },
  },
});
