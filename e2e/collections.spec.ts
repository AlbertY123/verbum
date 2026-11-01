import { expect, test, type Page } from "@playwright/test";
import { words } from "../src/data/words";
import { emptyState, recordReview } from "../src/lib/learning";

const collection = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Learning status" })
    .getByRole("button", { name: new RegExp("^" + name + " ") });

test("flashcards follow the selected words and do not record reviews", async ({
  page,
}) => {
  await page.goto("/#library?collection=to-learn");
  await page.getByLabel("Search vocabulary").fill("elucidate");
  await page
    .getByRole("button", { name: "Practise these words with flashcards" })
    .click();
  await expect(
    page.getByRole("heading", { name: "elucidate", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".definition")).toHaveCount(0);
  await page.getByRole("button", { name: "Show meaning" }).click();
  await expect(page.locator(".definition")).toHaveText(
    words.find((word) => word.word === "elucidate")!.definition,
  );
  await page.getByRole("button", { name: "Hide meaning" }).click();
  await expect(page.locator(".definition")).toHaveCount(0);
  await page.getByRole("button", { name: "Finish flashcards" }).click();
  await expect(collection(page, "Learned")).toHaveText("Learned0");
  await expect(page.getByLabel("Search vocabulary")).toHaveValue("elucidate");
});

test("home collections lead to learning, and a first practice moves the word into Learned", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Browse learned words" }).click();
  await expect(collection(page, "Learned")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Your learned words will appear here." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: /begin/ }).click();
  const headword = await page.locator(".study-card h1").innerText();
  await page.getByRole("button", { name: "Try it in context" }).click();
  await page.getByRole("button", { name: "Type it from memory" }).click();
  await page.getByLabel("Your answer").fill("not-the-answer");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Practise again later" }).click();
  await page.getByRole("button", { name: "Back to your desk" }).click();
  await page.getByRole("button", { name: "Browse learned words" }).click();
  await expect(collection(page, "Learned")).toHaveText("Learned1");
  await expect(collection(page, "To learn")).toHaveText(
    "To learn" + (words.length - 1),
  );
  await expect(page.locator(".word-card")).toHaveCount(1);
  await expect(page.locator(".word-card h2")).toHaveText(headword);
  await expect(page.locator(".collection-note")).toContainText(
    "practised at least once",
  );
  await page.reload();
  await expect(collection(page, "Learned")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await collection(page, "To learn").click();
  await page.getByLabel("Search vocabulary").fill(headword);
  await expect(
    page
      .locator(".word-card")
      .getByRole("heading", { name: headword, exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Search vocabulary").fill("no-match-zzzz");
  await expect(
    page.getByRole("heading", { name: "No words found." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(collection(page, "To learn")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goBack();
  await expect(collection(page, "Learned")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".word-card h2")).toHaveText(headword);
});

test("learned counts ignore obsolete records and filters/bookmarks stay within the chosen collection", async ({
  page,
}) => {
  const yesterday = new Date(Date.now() - 2 * 86400000);
  let state = { ...emptyState(), name: "Alex", onboarded: true };
  state = recordReview(state, words[0].id, "good", yesterday);
  state = recordReview(state, "obsolete-imported-word", "good", yesterday);
  await page.addInitScript(
    (value) =>
      localStorage.setItem("verbum.learner.v1.guest", JSON.stringify(value)),
    state,
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Browse learned words" }),
  ).toContainText("Learned1");
  await expect(
    page.getByRole("button", { name: "Browse learned words" }),
  ).toContainText("1 due for review");
  await page.getByRole("button", { name: "Browse learned words" }).click();
  await expect(page.locator(".word-status")).toHaveText("Review due");
  await page
    .getByRole("button", { name: "Save " + words[0].word, exact: true })
    .click();
  await page.getByRole("button", { name: /^Saved words/ }).click();
  await page.locator(".library-filters > summary").click();
  await page.getByLabel("Filter category").selectOption(words[0].category);
  await page.getByLabel("Filter difficulty").selectOption(words[0].level);
  await page.locator(".library-filters > summary").click();
  await expect(page.locator(".library-filters > summary")).toContainText(
    "2 active",
  );
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.getByLabel("Search vocabulary").fill("no-match-zzzz");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(collection(page, "Learned")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".word-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("verbum.learner.v1.guest") || "null")
          .saved,
    ),
  ).toContain(words[0].id);
});

test("home and collection filters fit mobile and keep the other practice modes reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Today’s practice" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/collections-home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Browse words to learn" }).click();
  await page.locator(".library-filters > summary").click();
  await expect(page.getByLabel("Filter category")).toBeVisible();
  await expect(page.locator(".result-count > span")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/collections-library-mobile.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await expect(page.locator(".practice-card")).toHaveCount(4);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#today");
  await page.screenshot({
    path: "artifacts/collections-home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Browse words to learn" }).click();
  await page.screenshot({
    path: "artifacts/collections-library-desktop.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({ path: "artifacts/collections-library-dark.png" });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "My desk", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/collections-home-dark.png" });
});
