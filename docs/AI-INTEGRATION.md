# AI connections

AI is optional. Bundled vocabulary, review scheduling, flashcards, sentence gaps and typing practice run without a paid provider. There is no operator-funded inference endpoint or shared inference key.

## OpenRouter

Users connect through OpenRouter's supported [OAuth PKCE flow](https://openrouter.ai/docs/guides/overview/auth/oauth), approve a key for their own account, then choose a model. Requests go directly from their browser to OpenRouter and use their own credits. No operator key is required.

Verbum uses a random state, an S256 verifier, a ten-minute pending-flow expiry and a single code exchange. The state is embedded in the callback URL as well as the authorisation request. Callback parameters are removed before further rendering. Switching providers removes the old key and model. Disconnecting while a connection is pending prevents it from being installed afterwards.

Model discovery reports live per-token prices and filters out non-text models and models explicitly lacking JSON response support. Free models appear first. No model is selected automatically and a failed request never falls back to another paid model. Set an appropriate key credit limit in [OpenRouter settings](https://openrouter.ai/settings/keys).

## OpenAI API key

Users may instead enter their own OpenAI API key. This is API billing against that user's OpenAI project. Verbum does not supply an API key, pay for the request or offer a subscription-login flow.

Connecting calls [GET /v1/models](https://developers.openai.com/api/reference/resources/models/methods/list) to verify the key and discover availability. It does not generate a completion. Available model IDs are intersected with the documented text/Chat Completions models supported by this integration:

- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [GPT-6.1 Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra)
- [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
- [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra)

This allowlist was checked on 1 November 2026. Review it when provider models change. Image, audio, embedding, unknown and already-shut-down models are not offered. The user must select a model explicitly. OpenAI model discovery does not include prices, so `promptPrice` and `completionPrice` are `null`, meaning **unknown, never free**. The UI links to [current API pricing](https://developers.openai.com/api/docs/pricing) rather than displaying a fabricated price.

Writing feedback and word generation use [POST /v1/chat/completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), bounded to 4,000 completion tokens with JSON output and `store: false`. Provider-side retention and abuse-monitoring policies still apply. A timeout or rejected output can still incur provider usage; Verbum never automatically retries.

### Browser credential boundary

The [official JavaScript SDK documentation](https://developers.openai.com/api/reference/typescript) describes opt-in browser support and warns that browser credentials are exposed to scripts and people with access to the browser. Verbum uses direct `fetch` for the same browser API flow; it is deliberately a learner-owned-key integration, not a way to distribute an application secret. Use a dedicated, restricted project key and review provider budgets and usage limits. The settings screen explains this trade-off before connection.

Both providers' credentials and selected models stay in `sessionStorage`. They are never written to Supabase, progress exports, source code or application logs. Normal tab closure clears this storage, but browser session restoration can preserve it. Disconnect removes Verbum's copy; users must revoke the key in their provider account to invalidate it globally. On shared computers, disconnect and sign out before leaving.

Session storage is accessible to same-origin JavaScript. Keep the CSP restrictive, avoid third-party scripts, maintain dependencies and render AI output as plain text. The CSP must permit only the required provider origins, including `https://openrouter.ai` and `https://api.openai.com`. Verbum does not store AI credentials across devices.

## Generated content

Word generation and feedback are validated for field shapes, lengths, categories, duplicate words, HTML and required explanations. Validation cannot guarantee educational accuracy: users preview generated entries before adding them. Requests contain only the relevant topic, target word, scenario and sentence, not account identity or the entire learning history. Manually prepared word JSON can also be imported through the same validator.

## Browser module contract

`src/lib/ai.ts` exports:

- `connectOpenRouter()` and `completeOpenRouterCallback()` for OpenRouter authorisation.
- `connectOpenAI(apiKey)` for a learner-owned OpenAI key, verified without inference.
- `getAIConnection()`, `disconnectAI()`, `listAIModels()` and `setAIModel(id)`.
- `generateWords(request)` and `requestWritingFeedback({ word, scenario, sentence })`.
- `buildWordPrompt(request)`, `buildWritingPrompt(input)`, `parseCustomWords(raw)` and `parseWritingFeedback(raw)`.

`AIConnection.provider` is `openrouter`, `openai` or `null`; the object never contains a key. Connection changes dispatch `verbum-ai-change`. Application sign-out and account switching call `disconnectAI()` so a subsequent learner cannot use another learner's credits.

## Verification

`tests/ai.test.ts` covers imports and feedback validation, OAuth state rejection, one-use exchange, callback separation, explicit model selection, provider switching, rejected candidate keys, pending-connection cancellation, endpoint isolation and secret-free connection status. Tests mock provider responses and spend no credits.

Before launch, use a learner-owned account for each enabled provider to connect, select a model, request feedback, generate words, disconnect and verify reconnection is required. No live paid inference has been asserted by the automated tests.
