import { expect, test, type Page } from "@playwright/test";
import { emptyState } from "../src/lib/learning";

async function mockGuestAuth(
  page: Page,
  initializationFails: boolean,
  succeeds = false,
) {
  const guest = {
    ...emptyState(),
    name: "Saved guest",
    dailyGoal: 3,
    onboarded: true,
  };
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        const record = ${JSON.stringify(guest)};
        const session = ${succeeds ? "{ user: { id: 'callback-account', email: 'learner@example.test' } }" : "null"};
        const query = {
          select() { return query; }, eq() { return query; },
          async maybeSingle() { return { data: { state: record, revision: 1 }, error: null }; }
        };
        export const cloudEnabled = true;
        export const supabase = { auth: {
          async initialize() {
            if (${succeeds}) {
              const url = new URL(location.href);
              url.searchParams.delete('code'); url.searchParams.delete('sb_flow_id');
              history.replaceState({}, '', url);
            }
            return { error: ${initializationFails ? "{ message: 'private-code-and-provider-detail' }" : "null"} };
          },
          async getSession() { return { data: { session }, error: null }; },
          onAuthStateChange(callback) {
            const timer = setTimeout(() => callback('INITIAL_SESSION', session), 5);
            return { data: { subscription: { unsubscribe() { clearTimeout(timer); } } } };
          }
        },
          from() { return query; }
        };
      `,
    });
  });
  await page.addInitScript((state) => {
    if (!localStorage.getItem("verbum.learner.v1.guest"))
      localStorage.setItem("verbum.learner.v1.guest", JSON.stringify(state));
  }, guest);
  return guest;
}

test("a successfully consumed callback restores the account without a failure notice", async ({
  page,
}) => {
  await mockGuestAuth(page, false, true);
  await page.goto(
    "/?code=successful-one-use-code&sb_flow_id=successful-flow#settings",
  );
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("What should we call you?")).toHaveValue(
    "Saved guest",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(page.url()).toMatch(/\/#settings$/);
});

test("cancelled Google callback preserves guest progress and offers sign-in recovery", async ({
  page,
}) => {
  const guest = await mockGuestAuth(page, true);
  await page.goto(
    "/?keep=1#error=access_denied&error_description=private-code-and-provider-detail",
  );
  await expect(page.getByRole("alert")).toContainText("Sign-in was cancelled");
  await expect(
    page.getByRole("heading", { name: "Find the words, Saved guest." }),
  ).toBeVisible();
  expect(page.url()).toMatch(/\/\?keep=1$/);
  await expect(page.locator("body")).not.toContainText(
    "private-code-and-provider-detail",
  );
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("verbum.learner.v1.guest") || "null"),
    ),
  ).toEqual(guest);
  await page.getByRole("button", { name: "Try sign-in again" }).click();
  await expect(page.getByRole("dialog")).toContainText("Continue with Google");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Find the words, Saved guest." }),
  ).toBeVisible();
});

for (const fails of [true, false]) {
  test(`${fails ? "expired code" : "code without this browser's verifier"} shows recovery instead of silently returning guest`, async ({
    page,
  }) => {
    const guest = await mockGuestAuth(page, fails);
    await page.goto("/?code=one-use-secret&sb_flow_id=private-flow#settings");
    await expect(page.getByRole("alert")).toContainText(
      "Sign-in could not be completed",
    );
    await expect(page.getByLabel("What should we call you?")).toHaveValue(
      guest.name,
    );
    expect(page.url()).toMatch(/\/#settings$/);
    await expect(page.locator("body")).not.toContainText("one-use-secret");
    await expect(page.locator("body")).not.toContainText(
      "private-code-and-provider-detail",
    );
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("verbum.learner.v1.guest") || "null"),
      ),
    ).toEqual(guest);
    await page.getByRole("button", { name: "Dismiss sign-in notice" }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}
