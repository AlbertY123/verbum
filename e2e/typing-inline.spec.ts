import { expect, test } from "@playwright/test";
import { words } from "../src/data/words";
import { normaliseTyping } from "../src/lib/learning";

test("typing stays inside the displayed sentence with an inline caret and corrections", async ({
  page,
}) => {
  await page.goto("/#typing");
  const editor = page.getByLabel("TYPE THE SENTENCE HERE");
  const surface = page.locator(".inline-typing");
  const target = normaliseTyping(words[0].example);
  const editorBox = await editor.boundingBox();
  const surfaceBox = await surface.boundingBox();
  expect(editorBox).toBeTruthy();
  expect(surfaceBox).toBeTruthy();
  expect(Math.abs(editorBox!.y - surfaceBox!.y)).toBeLessThan(2);
  expect(Math.abs(editorBox!.height - surfaceBox!.height)).toBeLessThan(2);
  await surface.click();
  await expect(editor).toBeFocused();
  await page.keyboard.type(target.slice(0, 3));
  await expect(page.locator(".char-correct")).toHaveCount(3);
  await expect(page.locator(".char-current")).toHaveCount(1);
  await expect(page.locator(".char-current")).toHaveText(target[3]);
  await page.keyboard.type("!");
  await expect(page.locator(".char-wrong")).toHaveCount(1);
  await page.keyboard.press("Backspace");
  await expect(page.locator(".char-wrong")).toHaveCount(0);
  await page.keyboard.type(target.slice(3));
  await expect(editor).toHaveAttribute("readonly", "");
  await expect(page.locator(".char-current")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: `What does “${words[0].word}” mean here?`,
    }),
  ).toBeFocused();
  await expect(page.locator(".typing-stats")).not.toContainText("100%");
});

test("touch users can focus the sentence and the editor remains in its visible surface", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/#typing");
  const editor = page.getByLabel("TYPE THE SENTENCE HERE");
  await expect(editor).not.toBeFocused();
  await page.locator(".inline-typing").tap();
  await expect(editor).toBeFocused();
  await page.keyboard.type("The");
  await expect(editor).toHaveValue("The");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(editor).not.toBeFocused();
  await expect(
    page.getByText("Click or tap the sentence to type."),
  ).toBeVisible();
  await context.close();
});

