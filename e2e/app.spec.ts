import { expect, test, type Page } from "@playwright/test";
import { words } from "../src/data/words";
import type { LearnerState } from "../src/types";

const storageKey = "verbum.learner.v1.guest";
const storedState = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "null"),
    storageKey,
  ) as Promise<LearnerState>;
const navigation = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true });

test("onboarding and context recall persist correct and incorrect review schedules", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start today.*practice/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/First name/).fill("Alex");
  await dialog.getByRole("slider").focus();
  await dialog.getByRole("slider").press("Home");
  await expect(dialog.getByRole("slider")).toHaveValue("3");
  await dialog.getByRole("button", { name: /begin/ }).click();
  const studied: string[] = [];

  for (let index = 0; index < 3; index++) {
    const headword = await page.locator(".study-card h1").innerText();
    const word = words.find((item) => item.word === headword)!;
    expect(word).toBeTruthy();
    studied.push(word.id);
    await page.getByRole("button", { name: "Reveal meaning" }).click();
    await expect(page.locator(".study-card .definition")).toHaveText(
      word.definition,
    );
    await page.getByRole("button", { name: "Try it in context" }).click();
    await page.getByRole("button", { name: "Type it from memory" }).click();
    await page
      .getByLabel("Your answer")
      .fill(index === 1 ? "an incorrect answer" : word.answer.toUpperCase());
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    if (index === 1) {
      await expect(page.getByRole("status")).toContainText("The target form");
      await page.getByRole("button", { name: "Practise again later" }).click();
    } else {
      await expect(page.getByRole("status")).toContainText(
        "Exactly. A precise choice.",
      );
      await page
        .getByRole("button", { name: "Remembered", exact: true })
        .click();
    }
  }
  await expect(
    page.getByRole("heading", { name: "A few words further." }),
  ).toBeVisible();
  const state = await storedState(page);
  expect(state.dailyGoal).toBe(3);
  expect(state.name).toBe("Alex");
  expect(Object.keys(state.progress)).toHaveLength(3);
  expect(state.progress[studied[0]].interval).toBeGreaterThanOrEqual(1);
  expect(state.progress[studied[1]].interval).toBe(0);
  expect(state.progress[studied[1]].lapses).toBe(1);
  const wrong = state.progress[studied[1]];
  expect(Date.parse(wrong.due) - Date.parse(wrong.lastReviewed)).toBe(
    10 * 60 * 1000,
  );
  await page.getByRole("button", { name: "Back to your desk" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Find the words, Alex." }),
  ).toBeVisible();
  await expect
    .poll(async () => Object.keys((await storedState(page)).progress).length)
    .toBe(3);
});

test("library search, difficulty, categories and bookmarks work together", async ({
  page,
}) => {
  const word = words.find((item) => item.word === "elucidate") ?? words[0];
  await page.goto("/#library");
  await page.getByLabel("Search vocabulary").fill(word.word);
  await page.locator(".library-filters > summary").click();
  await page.getByLabel("Filter difficulty").selectOption(word.level);
  await page.getByLabel("Filter category").selectOption(word.category);
  const card = page.locator(".word-card").filter({
    has: page.getByRole("heading", { name: word.word, exact: true }),
  });
  await expect(card).toHaveCount(1);
  await card
    .getByRole("button", { name: `Save ${word.word}`, exact: true })
    .click();
  await expect(
    card.getByRole("button", { name: `Unsave ${word.word}`, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Saved words/ }).click();
  await expect(card).toBeVisible();
  await card.locator(".word-card-main").click();
  const detail = page.getByRole("dialog");
  await expect(detail).toContainText(word.caution);
  await detail.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Search vocabulary").fill("zzzz-no-such-vocabulary");
  await expect(
    page.getByRole("heading", { name: "No words found." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".word-card")).toHaveCount(24);
  await page.reload();
  await page.getByRole("button", { name: /^Saved words/ }).click();
  await expect(page.locator(".word-card")).toHaveCount(1);
  expect((await storedState(page)).saved).toContain(word.id);
});

test("guided writing requires reflection and saves a journal entry", async ({
  page,
}) => {
  await page.goto("/#writing");
  await expect(page.locator(".source-extract")).not.toBeEmpty();
  await expect(page.locator(".sentence-stem")).toContainText(
    "A possible starting point",
  );
  const sentence =
    "The contrast between the mayor’s public claim and private spending elucidates his willingness to disguise self-interest as civic responsibility.";
  const save = page.getByRole("button", {
    name: "Save my practice",
    exact: true,
  });
  await expect(save).toBeDisabled();
  await page.getByLabel("Your analytical sentence").fill(sentence);
  await expect(save).toBeDisabled();
  for (const checkbox of await page
    .locator(".checklist")
    .getByRole("checkbox")
    .all())
    await checkbox.check();
  await save.click();
  await expect(
    page.getByRole("button", { name: "Saved to journal" }),
  ).toBeDisabled();
  await navigation(page, "My progress").click();
  await expect(page.locator(".journal-entry")).toContainText(sentence);
  await page.reload();
  await expect(page.locator(".journal-entry")).toContainText(sentence);
  expect((await storedState(page)).writing).toHaveLength(1);
});

test("typing requires the full sentence and a comprehension answer before recording practice", async ({
  page,
}) => {
  const word = words[0];
  await page.goto("/#typing");
  const input = page.getByLabel("TYPE THE SENTENCE HERE");
  await input.pressSequentially("!");
  await input.press("Backspace");
  await input.pressSequentially(word.example, { delay: 1 });
  await expect(input).toHaveAttribute("readonly", "");
  await expect(
    page.getByRole("button", { name: "Check understanding" }),
  ).toBeDisabled();
  expect(
    Object.values((await storedState(page)).activity).reduce(
      (sum, day) => sum + day.typing,
      0,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: word.definition, exact: true })
    .click();
  await page.getByRole("button", { name: "Check understanding" }).click();
  await expect(page.getByRole("status")).toContainText("Practice recorded.");
  expect(
    Object.values((await storedState(page)).activity).reduce(
      (sum, day) => sum + day.typing,
      0,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Next sentence" }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeEnabled();
});

test("mobile navigation and dark mode remain usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await navigation(page, "Word library").click();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("heading", { name: "Your word library." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Search vocabulary").fill(words[0].word);
  await page.locator(".word-card-main").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("StrictMode restores a cloud learner on a fresh device without replacing preferences", async ({
  page,
}) => {
  const remote: LearnerState = {
    version: 1,
    name: "Cloud learner",
    dailyGoal: 7,
    focus: "All vocabulary",
    onboarded: true,
    progress: {},
    activity: {},
    saved: [],
    customWords: [],
    writing: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  // This exercises the React lifecycle and cloud-state restoration. It is not
  // a substitute for testing real provider credentials or PostgreSQL policies.
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
      const record = ${JSON.stringify(remote)};
      const user = { id: 'cloud-test-user', email: 'cloud@example.test' };
      export const cloudEnabled = true;
      export const supabase = {
        auth: {
          onAuthStateChange(callback) {
            const timer = setTimeout(() => callback('INITIAL_SESSION', { user }), 5);
            return { data: { subscription: { unsubscribe() { clearTimeout(timer); } } } };
          },
          async getSession() { await new Promise(resolve => setTimeout(resolve, 10)); return { data: { session: { user } }, error: null }; }
        },
        from() { return { select() { return { eq() { return { async maybeSingle() {
          await new Promise(resolve => setTimeout(resolve, 15));
          return { data: { state: record, revision: 1 }, error: null };
        } } } } } } },
        async rpc(_name, args) { return { data: { saved: true, state: args.p_state, revision: 2 }, error: null }; }
      };
    `,
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find the words, Cloud learner." }),
  ).toBeVisible();
  await expect(page.locator(".daily-goal")).toContainText("0 / 7 new words");
  const restored = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("verbum.learner.v1.cloud-test-user") || "null",
    ),
  );
  expect(restored.name).toBe("Cloud learner");
  expect(restored.onboarded).toBe(true);
  expect(restored.dailyGoal).toBe(7);
});
