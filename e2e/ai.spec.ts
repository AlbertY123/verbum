import { expect, test, type Page, type Route } from "@playwright/test";

// Deliberately fake credential. Every provider request is intercepted below.
const mockKey = "sk-proj-verbum-browser-test-not-a-real-key";
const model = "gpt-6-luna";
const customWord = {
  word: "perspicuous",
  partOfSpeech: "adjective",
  category: "Literary craft",
  level: "Advanced",
  definition: "Clear and readily understandable in expression.",
  example:
    "The writer’s perspicuous explanation makes a complex moral conflict accessible.",
  collocations: ["perspicuous explanation", "perspicuous prose"],
  caution: "Describes clarity of expression, not a person’s insight.",
  gap: "The narrator’s ___ explanation makes the competing motives easy to follow.",
  answer: "perspicuous",
};
const feedback = {
  verdict: "strong",
  meaning:
    "Elucidates accurately describes how the contrast makes the mayor’s motive clearer.",
  grammar: "The verb agrees with the singular subject, contrast.",
  register:
    "The expression is precise and appropriate for an analytical essay.",
  revision:
    "The contrast elucidates the mayor’s willingness to disguise self-interest as civic responsibility.",
  nextStep:
    "Name the office expenditure to make the supporting evidence more specific.",
};
type CompletionRequest = {
  model: string;
  messages: { role: string; content: string }[];
  max_completion_tokens?: number;
  store?: boolean;
};

async function json(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(data),
  });
}

async function mockProvider(
  page: Page,
  respond: (body: CompletionRequest) => { data: unknown; status?: number },
) {
  const completions: CompletionRequest[] = [];
  await page.route("https://api.openai.com/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return json(route, {});
    expect(request.headers().authorization).toBe(`Bearer ${mockKey}`);
    if (new URL(request.url()).pathname === "/v1/models") {
      expect(request.method()).toBe("GET");
      return json(route, { data: [{ id: model }, { id: "gpt-image-2.5" }] });
    }
    expect(new URL(request.url()).pathname).toBe("/v1/chat/completions");
    expect(request.method()).toBe("POST");
    const body = request.postDataJSON() as CompletionRequest;
    completions.push(body);
    const result = respond(body);
    return json(route, result.data, result.status);
  });
  return completions;
}

const completion = (data: unknown) => ({
  choices: [
    { finish_reason: "stop", message: { content: JSON.stringify(data) } },
  ],
});

async function connect(page: Page) {
  await page.goto("/#settings");
  await page.getByLabel("Your OpenAI API key").fill(mockKey);
  await page
    .getByRole("button", { name: "Connect OpenAI", exact: true })
    .click();
  const card = page.locator(".provider-card").filter({
    has: page.getByRole("heading", { name: "OpenAI", exact: true }),
  });
  await expect(card).toContainText("Connected");
  await expect(
    page.getByRole("button", { name: "Suggest words with AI" }),
  ).toBeDisabled();
  await card.getByLabel("AI model").selectOption(model);
  await expect(card.getByLabel("AI model")).toHaveValue(model);
}

test.beforeEach(async ({ page }) => {
  // Keep these tests isolated from any operator's configured database.
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export const supabase = null; export const cloudEnabled = false;",
    }),
  );
  await page.route("https://openrouter.ai/**", (route) =>
    route.abort("blockedbyclient"),
  );
});

test("OpenAI BYOK connects, gives guided feedback, previews and adds words, then disconnects", async ({
  page,
}) => {
  const calls = await mockProvider(page, (body) => ({
    data: completion(
      body.messages.some((message) =>
        message.content.includes("Create 5 useful vocabulary entries"),
      )
        ? { words: [customWord] }
        : feedback,
    ),
  }));
  await connect(page);
  expect(calls).toHaveLength(0); // Key verification and model choice never generate billable completions.
  await expect(page.getByLabel("Your OpenAI API key")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Writing workshop Build a precise/ })
    .click();
  await page
    .getByLabel("Your analytical sentence")
    .fill(
      "The contrast between the mayor’s public claim and private spending elucidates his willingness to disguise self-interest as civic responsibility.",
    );
  await page
    .getByRole("button", { name: "Get AI feedback", exact: true })
    .click();
  await expect(page.locator(".feedback-panel")).toContainText(feedback.meaning);
  await expect(page.locator(".feedback-panel")).toContainText(
    feedback.nextStep,
  );
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    model,
    max_completion_tokens: 4000,
    store: false,
  });

  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page
    .getByRole("button", { name: "Suggest words with AI", exact: true })
    .click();
  await expect(page.locator(".word-preview")).toContainText(
    customWord.definition,
  );
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("verbum.learner.v1.guest") || "{}")
        .customWords,
  );
  expect(before).toHaveLength(0); // Generation never saves an unreviewed word automatically.
  await page
    .getByRole("button", { name: "Add reviewed words", exact: true })
    .click();
  await expect(page.locator('.notice[role="status"]')).toContainText(
    "1 new words added",
  );
  const stored = await page.evaluate(() => ({
    state: JSON.parse(localStorage.getItem("verbum.learner.v1.guest") || "{}"),
    localValues: Object.keys(localStorage).map((key) =>
      localStorage.getItem(key),
    ),
    sessionKey: sessionStorage.getItem("verbum.openai.session"),
  }));
  expect(stored.state.customWords).toHaveLength(1);
  expect(stored.state.customWords[0].word).toBe(customWord.word);
  expect(stored.sessionKey).toBe(mockKey);
  expect(stored.localValues.join("")).not.toContain(mockKey);
  expect(calls).toHaveLength(2);

  await page
    .getByRole("button", { name: "Disconnect OpenAI", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Connect OpenAI", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("verbum.openai.session")),
  ).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem("verbum.openai.model")),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Suggest words with AI", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("verbum.learner.v1.guest") || "{}")
          .customWords.length,
    ),
  ).toBe(1);
});

test("provider usage errors are visible and never trigger an automatic retry", async ({
  page,
}) => {
  const calls = await mockProvider(page, () => ({
    status: 429,
    data: { error: { message: "Mock rate limit" } },
  }));
  await connect(page);
  await page
    .getByRole("button", { name: "Suggest words with AI", exact: true })
    .click();
  await expect(page.locator('.notice[role="status"]')).toContainText(
    "rate or account usage limit",
  );
  await expect(page.locator(".word-preview")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Suggest words with AI", exact: true }),
  ).toBeEnabled();
  expect(calls).toHaveLength(1);
  expect(
    await page.evaluate(() => sessionStorage.getItem("verbum.openai.session")),
  ).toBe(mockKey);
});

test("invalid AI word packs are rejected before preview or persistence", async ({
  page,
}) => {
  const calls = await mockProvider(page, () => ({
    data: completion({ words: [customWord, customWord] }),
  }));
  await connect(page);
  await page
    .getByRole("button", { name: "Suggest words with AI", exact: true })
    .click();
  await expect(page.locator('.notice[role="status"]')).toContainText(
    "invalid or repeated word",
  );
  await expect(page.locator(".word-preview")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("verbum.learner.v1.guest") || "{}")
          .customWords,
    ),
  ).toHaveLength(0);
  expect(calls).toHaveLength(1);
});
