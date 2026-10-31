import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWordPrompt,
  parseCustomWords,
  parseWritingFeedback,
} from "../src/lib/ai";

const entry = {
  word: "elucidate",
  partOfSpeech: "verb",
  category: "Analytical verbs",
  level: "Advanced",
  definition: "Make an idea clearer by explaining it.",
  example: "The final scene elucidates the cost of conformity.",
  collocations: ["elucidate a tension", "elucidate a motive"],
  caution: "Use when an idea becomes clearer, not when it is merely mentioned.",
  gap: "The contrast ___ the conflict between loyalty and freedom.",
  answer: "elucidates",
};

describe("AI curriculum import", () => {
  it("accepts valid JSON, strips fences and owns custom ids", () => {
    const [word] = parseCustomWords(
      `\`\`\`json\n${JSON.stringify({ words: [{ ...entry, id: "unsafe-original-id" }] })}\n\`\`\``,
    );
    expect(word.id).toBe("custom-elucidate");
    expect(word.answer).toBe("elucidates");
  });
  it("rejects duplicates, empty imports and oversized collections", () => {
    expect(() => parseCustomWords(JSON.stringify([entry, entry]))).toThrow(
      /repeated/,
    );
    expect(() => parseCustomWords("[]")).toThrow(/between 1 and 10/);
    expect(() =>
      parseCustomWords(JSON.stringify(Array(11).fill(entry))),
    ).toThrow(/between 1 and 10/);
  });
  it("rejects missing explanations, invalid category and ambiguous gaps", () => {
    expect(() =>
      parseCustomWords(JSON.stringify([{ ...entry, caution: "" }])),
    ).toThrow(/caution/);
    expect(() =>
      parseCustomWords(JSON.stringify([{ ...entry, category: "Other" }])),
    ).toThrow(/category/);
    expect(() =>
      parseCustomWords(JSON.stringify([{ ...entry, gap: "___ and ___" }])),
    ).toThrow(/exactly one/);
  });
  it("does not accept HTML or silently use truncated JSON", () => {
    expect(() =>
      parseCustomWords(
        JSON.stringify([{ ...entry, example: "<img src=x onerror=alert(1)>" }]),
      ),
    ).toThrow(/example/);
    expect(() => parseCustomWords('{"words":[')).toThrow(/complete JSON/);
  });
  it("bounds prompts and preserves user text as quoted data", () => {
    expect(() => buildWordPrompt(" ")).toThrow();
    expect(() => buildWordPrompt("x".repeat(1201))).toThrow();
    expect(buildWordPrompt("tone for argument analysis")).toContain(
      "Australian",
    );
  });
  it("validates the entire feedback shape", () => {
    const feedback = {
      verdict: "developing",
      meaning: "Fits the claim.",
      grammar: "Add an object.",
      register: "Appropriate.",
      revision: "The scene elucidates her motive.",
      nextStep: "Name the relevant detail.",
    };
    expect(parseWritingFeedback(JSON.stringify(feedback))).toEqual(feedback);
    expect(() =>
      parseWritingFeedback(JSON.stringify({ ...feedback, verdict: "perfect" })),
    ).toThrow(/verdict/);
  });
});

describe("OpenRouter account isolation", () => {
  const stored = new Map<string, string>();
  const replaceState = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    stored.clear();
    replaceState.mockReset();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    });
    vi.stubGlobal("window", {
      location: {
        href: "https://verbum.example/?ai_provider=openrouter&code=one-use-code&state=expected",
      },
      history: { replaceState },
      dispatchEvent: vi.fn(),
      isSecureContext: true,
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a mismatched state before contacting the provider", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    stored.set(
      "verbum.openrouter.pkce",
      JSON.stringify({
        state: "wrong",
        verifier: "verifier",
        startedAt: Date.now(),
      }),
    );
    const { completeOpenRouterCallback } = await import("../src/lib/ai");
    await expect(completeOpenRouterCallback()).rejects.toThrow(
      /does not match/,
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith({}, "", "/");
    expect(stored.has("verbum.openrouter.pkce")).toBe(false);
  });

  it("exchanges a valid callback once and never persists the key outside this session", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ key: "sk-or-v1-test-credential-long-enough" }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    stored.set(
      "verbum.openrouter.pkce",
      JSON.stringify({
        state: "expected",
        verifier: "verifier",
        startedAt: Date.now(),
      }),
    );
    const { completeOpenRouterCallback, getAIConnection, disconnectAI } =
      await import("../src/lib/ai");
    expect(await completeOpenRouterCallback()).toBe(true);
    expect(await completeOpenRouterCallback()).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getAIConnection()).toEqual({
      connected: true,
      provider: "openrouter",
      model: null,
    });
    const request = fetcher.mock.calls[0][1];
    expect(request.headers.Authorization).toBeUndefined();
    expect(JSON.parse(request.body).code_verifier).toBe("verifier");
    disconnectAI();
    expect(getAIConnection().connected).toBe(false);
  });

  it("does not consume the application sign-in callback", async () => {
    vi.stubGlobal("window", {
      location: { href: "https://verbum.example/?code=supabase-code" },
    });
    const { completeOpenRouterCallback } = await import("../src/lib/ai");
    expect(await completeOpenRouterCallback()).toBe(false);
  });

  it("requires an explicit model selection before any billable request", async () => {
    stored.set("verbum.openrouter.session", "sk-or-test-long-enough");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { generateWords } = await import("../src/lib/ai");
    await expect(generateWords("verbs for essays")).rejects.toThrow(
      /Choose an AI model/,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("verifies an OpenAI key with discovery only and exposes no credential", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { id: "gpt-6-luna" },
              { id: "gpt-6.1-sol" },
              { id: "gpt-image-2.5" },
              { id: "gpt-6-astra", shutdown_date: "2020-01-01" },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const { connectOpenAI, getAIConnection, listAIModels } =
      await import("../src/lib/ai");
    const key = "sk-proj-learner-owned-test-key-only";
    await connectOpenAI(key);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.openai.com/v1/models");
    expect(fetcher.mock.calls[0][1].body).toBeUndefined();
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(
      `Bearer ${key}`,
    );
    expect(getAIConnection()).toEqual({
      connected: true,
      provider: "openai",
      model: null,
    });
    expect(JSON.stringify(getAIConnection())).not.toContain(key);
    expect(stored.get("verbum.openai.session")).toBe(key);
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "gpt-6-luna" }, { id: "gpt-image-2.5" }],
        }),
        { status: 200 },
      ),
    );
    expect(await listAIModels()).toEqual([
      {
        id: "gpt-6-luna",
        name: "GPT-6 Luna",
        promptPrice: null,
        completionPrice: null,
      },
    ]);
  });

  it("switches providers without retaining an old key or model and routes OpenAI completions correctly", async () => {
    stored.set("verbum.openrouter.session", "sk-or-old-account");
    stored.set("verbum.openrouter.model", "provider/old-model");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: "gpt-6-luna" }] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: "stop",
                message: { content: JSON.stringify({ words: [entry] }) },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const {
      connectOpenAI,
      setAIModel,
      generateWords,
      getAIConnection,
      disconnectAI,
    } = await import("../src/lib/ai");
    await connectOpenAI("sk-proj-new-account-test-credential");
    expect(stored.has("verbum.openrouter.session")).toBe(false);
    expect(stored.has("verbum.openrouter.model")).toBe(false);
    expect(getAIConnection().model).toBeNull();
    await expect(generateWords("essay verbs")).rejects.toThrow(
      /Choose an AI model/,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(() => setAIModel("gpt-image-2.5")).toThrow(/supported OpenAI/);
    setAIModel("gpt-6-luna");
    expect((await generateWords("essay verbs"))[0].word).toBe("elucidate");
    expect(fetcher.mock.calls[1][0]).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
    const body = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(body).toMatchObject({
      model: "gpt-6-luna",
      max_completion_tokens: 4000,
      store: false,
    });
    expect(body.max_tokens).toBeUndefined();
    disconnectAI();
    expect(stored.size).toBe(0);
    expect(getAIConnection()).toEqual({
      connected: false,
      provider: null,
      model: null,
    });
  });

  it("does not disconnect an existing provider when a candidate OpenAI key is rejected", async () => {
    stored.set("verbum.openrouter.session", "sk-or-current-account");
    stored.set("verbum.openrouter.model", "provider/current-model");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    const { connectOpenAI, getAIConnection } = await import("../src/lib/ai");
    await expect(
      connectOpenAI("sk-proj-invalid-test-credential"),
    ).rejects.toThrow(/did not accept/);
    expect(getAIConnection()).toEqual({
      connected: true,
      provider: "openrouter",
      model: "provider/current-model",
    });
    expect(stored.has("verbum.openai.session")).toBe(false);
  });

  it("does not install a pending OpenAI credential after disconnection", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const { connectOpenAI, disconnectAI, getAIConnection } =
      await import("../src/lib/ai");
    const pending = connectOpenAI("sk-proj-pending-test-credential");
    disconnectAI();
    resolve(
      new Response(JSON.stringify({ data: [{ id: "gpt-6-luna" }] }), {
        status: 200,
      }),
    );
    await expect(pending).rejects.toThrow(/connection changed/);
    expect(getAIConnection().connected).toBe(false);
  });

  it("clears OpenAI credentials when replacing them with an OpenRouter connection", async () => {
    stored.set("verbum.openai.session", "sk-proj-old-account");
    stored.set("verbum.openai.model", "gpt-6-luna");
    stored.set(
      "verbum.openrouter.pkce",
      JSON.stringify({
        state: "expected",
        verifier: "verifier",
        startedAt: Date.now(),
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ key: "sk-or-v1-new-account-credential" }),
            { status: 200 },
          ),
        ),
    );
    const { completeOpenRouterCallback, getAIConnection } =
      await import("../src/lib/ai");
    await completeOpenRouterCallback();
    expect(stored.has("verbum.openai.session")).toBe(false);
    expect(stored.has("verbum.openai.model")).toBe(false);
    expect(getAIConnection()).toEqual({
      connected: true,
      provider: "openrouter",
      model: null,
    });
  });
});
