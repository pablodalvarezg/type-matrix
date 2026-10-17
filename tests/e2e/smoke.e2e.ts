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

test("home: the six modes, linked", async ({ page }) => {
  await page.goto("/");
  for (const href of [
    "/calculator",
    "/team",
    "/hangman",
    "/guess",
    "/battler",
    "/daily",
  ]) {
    await expect(page.locator(`main a[href="${href}"]`)).toBeVisible();
  }
  await expect(page.getByText(/Next puzzle in \d+:\d\d/)).toBeVisible();
  // The link's name is the title alone, not the ticking countdown.
  await expect(page.getByRole("link", { name: "Daily puzzle" })).toBeVisible();
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
  await spellOut(page);
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
  await expect(
    page.getByText(/^\d+ points \(\d+ wins?\)$/).first(),
  ).toBeVisible();
});

test("hangman campaign: a Gen I game, then the next one", async ({ page }) => {
  await page.goto("/hangman");
  await page.getByRole("button", { name: "Play Gen I" }).click();
  await page.waitForURL(/\/hangman\/[\w-]+$/);
  await expect(
    page.getByRole("heading", { name: "Hangman campaign: Gen I" }),
  ).toBeVisible();
  await spellOut(page);
  await expect(page.getByText(/^Gen I: \d+ of 10 wins\.$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Gen I" })).toBeVisible();
});

test("dex clues: a hint, resumed from the breadcrumb, then given up", async ({
  page,
}) => {
  await page.goto("/guess");
  await page.getByRole("button", { name: "New game" }).click();
  await page.waitForURL(/\/guess\/[\w-]+$/);
  const game = page.url();
  // Three misses unlock the generation. One in ~340 games one of them is
  // the answer: the game ends, and the next guess or the hint check fails.
  // The client cannot know.
  for (const name of ["Bulbasaur", "Charmander", "Squirtle"]) {
    await page.getByRole("combobox", { name: "Species" }).fill(name);
    await page.getByRole("button", { name: "Guess" }).click();
    await expect(page.getByRole("status").first()).toContainText(`${name}:`);
  }
  await expect(page.getByText(/^Gen [IVX]+$/)).toBeVisible();

  // Leaving keeps the game open: the mode's page offers it back.
  await page.getByRole("link", { name: "← Dex Clues" }).click();
  await page.getByRole("link", { name: "Continue your game" }).click();
  await page.waitForURL(game);
  await expect(page.getByRole("list", { name: "Your guesses" })).toContainText(
    "Bulbasaur",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Give up" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    /You gave up\. It was /,
  );
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
});

test("battler: an easy draft, ordered, and its bracket", async ({ page }) => {
  await page.goto("/battler");
  // A run an earlier test left open is offered back; it is finished here.
  const easy = page.getByRole("region", { name: "Easy" });
  await easy
    .getByRole("button", { name: "Start a draft" })
    .or(easy.getByRole("link", { name: "Continue your game" }))
    .click();
  await page.waitForURL(/\/battler\/[\w-]+$/);

  const reroll = page.getByRole("button", { name: /^Reroll the offers/ });
  if (await reroll.isVisible()) {
    const before = await reroll.innerText();
    await reroll.click();
    await expect(reroll).not.toHaveText(before);
  }

  const stage = page.getByRole("heading", { level: 2 }).first();
  for (;;) {
    const pick = /^Pick (\d) of 6$/.exec(await stage.innerText());
    if (!pick) break;
    await page.getByRole("list").first().getByRole("button").first().click();
    await expect(stage).toHaveText(
      pick[1] === "6" ? "Order your team" : `Pick ${Number(pick[1]) + 1} of 6`,
    );
  }

  await page
    .getByRole("button", { name: /^Move .+ down$/ })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText("is now number 2");
  await page.getByRole("button", { name: "Start the tournament" }).click();
  // Rival matches appear on their own; the player's waits for "Begin
  // combat", and "Skip" jumps to the next one. The outcome waits for the end.
  const outcome = page.getByText(/^(Champion!|Runner-up|Out in the)/);
  const control = page.getByRole("button", {
    name: /^(Begin combat|Skip)$/,
  });
  await expect(control).toHaveText("Begin combat");
  await expect(page.getByRole("log", { name: "Battle log" })).toBeEmpty();
  await expect(outcome).toHaveCount(0);
  while (await control.isVisible()) {
    await control.click().catch(() => {});
  }
  await expect(outcome).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Final", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
});

test("daily dex clues: played out, with its streak", async ({ page }) => {
  await page.goto("/daily");
  await page.getByRole("button", { name: "Play today's Dex Clues" }).click();
  await page.waitForURL(/\/daily\/guess\/\d+$/);
  await expect(
    page.getByRole("heading", { name: /Daily Dex Clues #\d+/ }),
  ).toBeVisible();
  await playOut(page);
  await expect(page.getByText(/Streak: \d+ · best \d+/)).toBeVisible();
});

test("daily hangman: played out, with its streak", async ({ page }) => {
  await page.goto("/daily");
  await page.getByRole("button", { name: "Play today's Hangman" }).click();
  await page.waitForURL(/\/daily\/hangman\/\d+$/);
  await expect(
    page.getByRole("heading", { name: /Daily Hangman #\d+/ }),
  ).toBeVisible();
  await spellOut(page);
  await expect(page.getByText(/Streak: \d+ · best \d+/)).toBeVisible();
});

/** Tries letters until the game ends; six misses at most, so it always does. */
async function spellOut(page: Page) {
  const status = page
    .getByRole("status")
    .filter({ hasText: /left|Got it|It was/ });
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
}

/** Guesses distinct species until the game ends; ten are always enough. */
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
    "Lapras",
    "Jigglypuff",
  ];
  for (const name of guesses) {
    const field = page.getByRole("combobox", { name: "Species" });
    if (!(await field.isVisible())) break;
    await field.fill(name);
    await page.getByRole("button", { name: "Guess" }).click();
    await expect(status).toContainText(new RegExp(`${name}:|Got it|It was`));
  }
  await expect(status).toContainText(OVER);
}
