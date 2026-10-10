import { expect, test, type Page } from "@playwright/test";

/*
 * One test per mode, played the way a person would. The games run to the
 * end without knowing the answer: the client never has it.
 */

const OVER = /Got it|It was/;

// Every page a test ends on, at the 360 px of the config.
test.afterEach(async ({ page }) => {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, "horizontal scroll").toBeLessThanOrEqual(360);
});

test("home: the five modes, linked", async ({ page }) => {
  await page.goto("/");
  for (const href of ["/calculator", "/team", "/hangman", "/guess", "/daily"]) {
    await expect(page.locator(`main a[href="${href}"]`)).toBeVisible();
  }
});

test("calculator: a damage range for a matchup", async ({ page }) => {
  await page.goto("/calculator");
  const side = (name: string) => page.getByRole("group", { name });
  await side("attacker")
    .getByRole("combobox", { name: "Species" })
    .fill("Garchomp");
  await side("defender")
    .getByRole("combobox", { name: "Species" })
    .fill("Blissey");
  await page.getByRole("combobox", { name: "Move" }).fill("Earthquake");
  await page.getByRole("button", { name: "Calculate" }).click();

  const result = page.getByRole("region", { name: "Result" });
  await expect(result).toContainText("Garchomp's Earthquake against Blissey");
  await expect(result).toContainText(/\d+–\d+ of \d+ HP/);
});

test("team: shared weaknesses and coverage", async ({ page }) => {
  await page.goto("/team");
  await page.getByRole("combobox", { name: "Member 1" }).fill("Garchomp");
  await page.getByRole("combobox", { name: "Member 2" }).fill("Blissey");
  await page.getByRole("button", { name: "Analyze" }).click();

  await expect(
    page.getByRole("heading", { name: "Shared weaknesses" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "STAB coverage" }),
  ).toBeVisible();
});

test("hangman: a game played to the end", async ({ page }) => {
  await page.goto("/hangman");
  await page.getByRole("button", { name: "New game" }).click();
  await page.waitForURL(/\/hangman\/[\w-]+$/);

  const status = page
    .getByRole("status")
    .filter({ hasText: /left|Got it|It was/ });
  // At most six misses, so the alphabet always ends the game.
  for (const letter of "eaoirnltsucmpdhgbkyfwvzxjq") {
    if (OVER.test(await status.innerText())) break;
    await page.getByRole("button", { name: letter, exact: true }).click();
    // The letter is marked tried, or it ended the game and the keys are gone.
    await expect(
      page
        .getByRole("button", { name: new RegExp(`^${letter}, `) })
        .or(status.filter({ hasText: OVER })),
    ).toBeVisible();
  }
  await expect(status).toContainText(OVER);
});

test("stats & types: a game played to the end", async ({ page }) => {
  await page.goto("/guess");
  await page.getByRole("button", { name: "New game" }).click();
  await page.waitForURL(/\/guess\/[\w-]+$/);
  await playOut(page);
});

test("daily: today's puzzle, its streak and leaderboard", async ({ page }) => {
  await page.goto("/daily");
  await page.getByRole("button", { name: "Play today's puzzle" }).click();
  await page.waitForURL(/\/daily\/\d+$/);
  await expect(
    page.getByRole("heading", { name: /Daily puzzle #\d+/ }),
  ).toBeVisible();
  await playOut(page);
  await expect(page.getByText(/Streak: \d+ · best \d+/)).toBeVisible();
});

/** Guesses distinct species until the game ends; eight are always enough. */
async function playOut(page: Page) {
  const status = page
    .getByRole("status")
    .filter({ hasText: /left|Got it|It was/ });
  const guesses = [
    "Bulbasaur",
    "Charmander",
    "Squirtle",
    "Pikachu",
    "Gengar",
    "Snorlax",
    "Dragonite",
    "Mewtwo",
    "Eevee",
  ];
  for (const name of guesses) {
    const field = page.getByRole("combobox", { name: "Species" });
    if (!(await field.isVisible())) break;
    await field.fill(name);
    await page.getByRole("button", { name: "Guess" }).click();
    await expect(status).toContainText(
      new RegExp(`${name}: types|Got it|It was`),
    );
  }
  await expect(status).toContainText(OVER);
}
