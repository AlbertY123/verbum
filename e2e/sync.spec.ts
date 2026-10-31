import { expect, test, type Page } from "@playwright/test";
import type { LearnerState } from "../src/types";

async function mockAccounts(
  page: Page,
  scenario: "failed-signout-save" | "account-switch",
) {
  const state: LearnerState = {
    version: 1,
    name: "Learner A",
    dailyGoal: 5,
    focus: "All vocabulary",
    onboarded: true,
    progress: {},
    activity: {},
    saved: [],
    customWords: [],
    writing: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
      const scenario = ${JSON.stringify(scenario)};
      const records = { a: ${JSON.stringify(state)}, b: { ...${JSON.stringify(state)}, name: 'Learner B' } };
      let currentId = 'a';
      const callbacks = new Set();
      const session = () => currentId ? { user: { id: currentId, email: currentId + '@example.test' } } : null;
      const emit = () => { for (const callback of callbacks) callback(currentId ? 'SIGNED_IN' : 'SIGNED_OUT', session()); };
      window.__verbumSyncTest = {
        calls: [], signOutScopes: [],
        switchToB() { currentId = 'b'; emit(); },
        resolveA: null
      };
      export const cloudEnabled = true;
      export const supabase = {
        auth: {
          onAuthStateChange(callback) {
            callbacks.add(callback);
            const timer = setTimeout(() => callback('INITIAL_SESSION', session()), 5);
            return { data: { subscription: { unsubscribe() { clearTimeout(timer); callbacks.delete(callback); } } } };
          },
          async getSession() { return { data: { session: session() }, error: null }; },
          async signOut(options) {
            window.__verbumSyncTest.signOutScopes.push(options?.scope ?? 'global');
            if (!options?.scope) return { error: new Error('Revocation unavailable') };
            currentId = null; emit(); return { error: null };
          }
        },
        from() { return { select() { return { eq(_key, id) { return { async maybeSingle() {
          return { data: { state: records[id], revision: 1 }, error: null };
        } } } } } } },
        async rpc(_name, args) {
          window.__verbumSyncTest.calls.push(args);
          if (scenario === 'failed-signout-save') return { data: null, error: { message: 'Network unavailable' } };
          if (args.p_user_id === 'a') return new Promise(resolve => {
            window.__verbumSyncTest.resolveA = () => resolve({ data: { saved: true, state: args.p_state, revision: 2 }, error: null });
          });
          return { data: { saved: true, state: args.p_state, revision: 2 }, error: null };
        }
      };
    `,
    });
  });
}

test("failed cloud flush cannot prevent sign-out or retain AI credentials", async ({
  page,
}) => {
  await mockAccounts(page, "failed-signout-save");
  await page.goto("/#settings");
  await expect(page.getByLabel("What should we call you?")).toHaveValue(
    "Learner A",
  );
  await page.evaluate(() => {
    sessionStorage.setItem(
      "verbum.openrouter.session",
      "test-only-openrouter-key",
    );
    sessionStorage.setItem("verbum.openai.session", "test-only-openai-key");
  });
  await page.getByLabel("What should we call you?").fill("Unsynced name");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create a free account" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Some progress is saved only on this device",
  );
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("verbum.openrouter.session"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem("verbum.openai.session")),
  ).toBeNull();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("verbum.learner.v1.a") || "null").name,
    ),
  ).toBe("Unsynced name");
  expect(await page.evaluate("window.__verbumSyncTest.signOutScopes")).toEqual([
    "global",
    "local",
  ]);
  await page.getByRole("button", { name: "Retry sync" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Some progress is saved only on this device",
  );
});

test("an old account save finishing wakes the new account pending save", async ({
  page,
}) => {
  await mockAccounts(page, "account-switch");
  await page.goto("/#settings");
  await expect(page.getByLabel("What should we call you?")).toHaveValue(
    "Learner A",
  );
  await page.getByLabel("What should we call you?").fill("Updated A");
  await expect
    .poll(() => page.evaluate("window.__verbumSyncTest.calls.length"))
    .toBe(1);
  await page.evaluate("window.__verbumSyncTest.switchToB()");
  await expect(page.getByLabel("What should we call you?")).toHaveValue(
    "Learner B",
  );
  await page.getByLabel("What should we call you?").fill("Updated B");
  // Let B's 800 ms debounce encounter the occupied write slot before A resolves.
  await page.waitForTimeout(1100);
  expect(await page.evaluate("window.__verbumSyncTest.calls.length")).toBe(1);
  await page.evaluate("window.__verbumSyncTest.resolveA()");
  await expect
    .poll(() => page.evaluate("window.__verbumSyncTest.calls.length"))
    .toBe(2);
  expect(
    await page.evaluate("window.__verbumSyncTest.calls[1].p_user_id"),
  ).toBe("b");
  expect(
    await page.evaluate("window.__verbumSyncTest.calls[1].p_state.name"),
  ).toBe("Updated B");
  await expect(page.locator(".sync-status")).toContainText(
    "All progress synced",
  );
});
