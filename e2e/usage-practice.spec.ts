import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { type UsageMode } from "../src/data/usage-exercises";
import { buildUsageBank } from "../src/lib/usage-bank";
import { words } from "../src/data/words";
import { emptyState } from "../src/lib/learning";

for (const mode of ["choice", "repair"] as const) {
  test(`${mode} teaches distinctions, retains first attempts and completes a five-question session`, async ({
    page,
  }) => {
    const pool = buildUsageBank(words, mode);
    // Exercise newly covered words first, independent of random deck order.
    const ids = [
      ...pool.filter((q) => q.kind === "bank"),
      ...pool.filter((q) => !q.kind),
    ].map((q) => q.id);
    await page.addInitScript(
      ({ mode, ids }) => {
        if (!localStorage.getItem(`verbum.usage-deck.v1.${mode}`))
          localStorage.setItem(
            `verbum.usage-deck.v1.${mode}`,
            JSON.stringify({ ids, completed: 0 }),
          );
      },
      { mode, ids },
    );
    await page.goto(`/#${mode}`);
    const recordedSessions = () =>
      page.evaluate((activityKey) => {
        const state = JSON.parse(
          localStorage.getItem("verbum.learner.v1.guest") || "{}",
        ) as {
          activity?: Record<string, { choice?: number; repair?: number }>;
        };
        return Object.values(state.activity ?? {}).reduce(
          (sum, activity) => sum + (activity[activityKey] ?? 0),
          0,
        );
      }, mode);
    const main = page.locator(".usage-practice");
    const check = main.getByRole("button", {
      name: mode === "choice" ? "Check choice" : "Check repair",
      exact: true,
    });
    await expect(check).toBeDisabled();
    const firstQuestionId = await main
      .locator("[data-exercise-id]")
      .getAttribute("data-exercise-id");
    for (let index = 0; index < 5; index++) {
      await expect(main.locator(".usage-session-header")).toContainText(
        `Question ${index + 1} of 5`,
      );
      const id = await main
        .locator("[data-exercise-id]")
        .getAttribute("data-exercise-id");
      const question = pool.find((item) => item.id === id)!;
      expect(question).toBeTruthy();
      const answer =
        index === 0 ? (question.correctIndex + 1) % 4 : question.correctIndex;
      await main
        .locator(".usage-options")
        .getByRole("button")
        .nth(answer)
        .click();
      await check.click();
      await expect(main.getByRole("status")).toContainText(
        question.options[answer].explanation,
      );
      await expect(main.getByRole("status")).toContainText(
        index === 0 ? "A distinction to notice." : "That fits the evidence.",
      );
      await expect(
        main.locator(".usage-options").getByRole("button").nth(answer),
      ).toBeDisabled();
      // A checked answer must stay on screen until the learner explicitly advances.
      await expect(main.locator("[data-exercise-id]")).toHaveAttribute(
        "data-exercise-id",
        id!,
      );
      if (index === 0) {
        await main
          .getByText("Compare all four options", { exact: true })
          .click();
        for (const option of question.options)
          await expect(main.locator(".usage-comparison")).toContainText(
            option.explanation,
          );
      }
      await main
        .getByRole("button", {
          name: index === 4 ? "Finish session" : "Next question",
          exact: true,
        })
        .click();
      if (index < 4) expect(await recordedSessions()).toBe(0);
    }
    await expect(
      main.getByRole("heading", { name: "A more precise way to say it." }),
    ).toBeVisible();
    await expect(main.locator(".usage-result")).toContainText("4 / 5");
    await expect(main.locator(".usage-result-review > div")).toHaveCount(5);
    await expect(main).toContainText("Session recorded.");
    await expect.poll(recordedSessions).toBe(1);
    await main.getByRole("button", { name: "Retry these questions" }).click();
    await expect(main.locator(".usage-session-header")).toContainText(
      "Question 1 of 5",
    );
    await expect(main.locator("[data-exercise-id]")).toHaveAttribute(
      "data-exercise-id",
      firstQuestionId!,
    );
    await expect(check).toBeDisabled();
    expect(await recordedSessions()).toBe(1);
    // Retrying does not rewind the saved deck. A new visit starts at the next set.
    await page.reload();
    await expect(main.locator("[data-exercise-id]")).toHaveAttribute(
      "data-exercise-id",
      ids[5],
    );
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("verbum.learner.v1.guest")!),
    );
    expect(Object.keys(saved.progress)).toHaveLength(0);
  });
}

test("usage activities work with keyboard input and fit mobile screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#repair");
  const question = page.locator(".usage-question");
  const choice = question.locator(".usage-option").first();
  await choice.focus();
  await page.keyboard.press("Space");
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  const check = question.getByRole("button", {
    name: "Check repair",
    exact: true,
  });
  await check.focus();
  await page.keyboard.press("Enter");
  await expect(question.getByRole("status")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

for (const mode of ["choice", "repair"] as UsageMode[]) {
  test(`${mode} includes personal vocabulary with usable mobile feedback`, async ({
    page,
  }) => {
    const personal = {
      ...words[0],
      id: "personal-expression",
      word: "personal expression",
      partOfSpeech: "phrase" as const,
      definition:
        "An expression used with a particular meaning by an individual.",
      gap: "The narrator's ___ reveals her distinctive way of seeing the world.",
      answer: "personal expression",
      caution: "Explain the expression's meaning in its particular context.",
    };
    const pool = buildUsageBank([...words, personal], mode);
    const question = pool.find((q) => q.wordId === personal.id)!;
    const ids = [
      question.id,
      ...pool.filter((q) => q.id !== question.id).map((q) => q.id),
    ];
    await page.addInitScript(
      ({ mode, ids, state }) => {
        localStorage.setItem("verbum.learner.v1.guest", JSON.stringify(state));
        localStorage.setItem(
          `verbum.usage-deck.v1.${mode}`,
          JSON.stringify({ ids, completed: 0 }),
        );
      },
      { mode, ids, state: { ...emptyState(), customWords: [personal] } },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#${mode}`);
    await expect(page.locator("[data-exercise-id]")).toHaveAttribute(
      "data-exercise-id",
      question.id,
    );
    await page.locator(".usage-option").nth(question.correctIndex).click();
    await page
      .getByRole("button", {
        name: mode === "choice" ? "Check choice" : "Check repair",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText(personal.caution);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/${mode}-full-bank-mobile.png`,
      fullPage: true,
    });
  });

  test(`${mode} question and feedback have no detected accessibility violations`, async ({
    page,
  }) => {
    await page.goto(`/#${mode}`);
    await expect(page.locator(".usage-question")).toBeVisible();
    const before = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(before.violations).toEqual([]);
    await page.locator(".usage-option").first().click();
    await page
      .getByRole("button", {
        name: mode === "choice" ? "Check choice" : "Check repair",
        exact: true,
      })
      .click();
    const after = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(after.violations).toEqual([]);
  });
}
