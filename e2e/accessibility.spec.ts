import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const theme of ["light", "dark"]) {
  for (const route of [
    "today",
    "library",
    "writing",
    "typing",
    "progress",
    "settings",
  ]) {
    test(`${route} has no detected WCAG A/AA issues in ${theme} mode`, async ({
      page,
    }) => {
      await page.addInitScript(
        (value) => localStorage.setItem("verbum.theme", value),
        theme,
      );
      await page.goto(`/#${route}`);
      await expect(page.locator("main h1")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test("onboarding dialog is labelled, keyboard-contained and accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start today.*practice/ }).click();
  const dialog = page.getByRole("dialog", {
    name: "Make a little room for words.",
  });
  await expect(dialog).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: /Start today.*practice/ }),
  ).toBeFocused();
});

test("skip link keeps the current route and focuses main content", async ({
  page,
}) => {
  await page.goto("/#library");
  await page.keyboard.press("Tab");
  await page.getByRole("link", { name: "Skip to content" }).press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Build your repertoire." }),
  ).toBeVisible();
});
