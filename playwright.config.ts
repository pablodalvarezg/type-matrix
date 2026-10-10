import { defineConfig, devices } from "@playwright/test";

/*
 * One smoke test per mode, against a production build on the database of
 * .env.local. `.e2e.ts`, not `.spec.ts`: Vitest's default glob takes specs.
 * Port 3100, so it never lands on a dev server on :3000.
 * Its games are real rows: never run it with .env.local pointing at
 * production.
 */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.e2e.ts",
  use: { baseURL: "http://localhost:3100" },
  // The smallest width the site supports.
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 800 },
      },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    timeout: 300_000,
  },
});
