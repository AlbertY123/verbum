# Verbum

**Words with purpose.** An independent vocabulary-learning app for VCE mainstream English, written in Australian English. Built with React, TypeScript and Vite; Supabase provides authentication and private cloud progress. The static frontend can run on Cloudflare Pages Free.

## What is implemented

- 600 original vocabulary entries in six categories: analytical verbs, argument and persuasion, tone and attitude, themes and ideas, character and society, and literary craft. Every entry includes a definition, essay example, two collocations, a usage caution and a gap exercise. See [curriculum notes](docs/CURRICULUM.md).
- Onboarding with 3–10 new words per day and an optional category focus.
- Daily recall, meaning cards, multiple-choice or typed sentence gaps, and adaptive spaced review. Misses return in 10 minutes; successful reviews increase the interval. A correct flashcard is not presented as proof of writing mastery.
- Searchable and filterable library with bookmarks and detailed word cards.
- Guided writing using fictional source material, an explicit analytical task, sentence stems, a self-assessment checklist and a persistent writing journal.
- Inline sentence typing with a moving caret, in-place error feedback, accuracy/speed feedback and a comprehension check before recording practice.
- Word choice and sentence repair: 40 authored questions teach precise meaning, appropriate claims and natural collocations through five-question sessions with explanations for every option.
- A single Practice hub groups guided writing, sentence typing, word choice and sentence repair; completed sessions count towards daily activity and streaks.
- Real progress statistics, local-date streaks, activity calendar and category progress.
- Guest/device mode, Supabase Google sign-in, account sync, progress backup/import and permanent account deletion. Email/password and recovery are available only when the operator enables production email delivery.
- Optional OpenRouter PKCE account linking or an OpenAI API key. Users select a model and pay their own provider. AI writing feedback and reviewed custom vocabulary packs are available; the core learning experience needs no AI.
- Responsive desktop/mobile layout, light and dark themes, labelled controls, keyboard navigation and modal focus handling.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

In PowerShell, use `Copy-Item .env.example .env.local`. The app runs at `http://localhost:5173`. With no Supabase configuration, all core learning works in device mode. Device data is not a cloud account and can be lost if browser storage is cleared; export a backup in Preferences.

```sh
npm run test       # curriculum, learning, AI and sync unit tests
npm run build      # TypeScript check + production build
npx playwright install chromium
npm run test:e2e   # browser flows and accessibility checks
```

The production bundle is in `dist/`. `npm run preview` serves it locally. A GitHub Actions workflow runs the checks on pushes and pull requests.

## Configure accounts and deploy at $0

1. Create a **Free** Supabase project. In its SQL editor apply [the schema migration](supabase/migrations/202611010001_learner_state.sql), then [the privilege migration](supabase/migrations/202611010002_learner_state_privileges.sql), skipping any already applied. The first creates the private data table, row-level policies, revision-checked save function and account deletion function; the second restricts authenticated table privileges to `SELECT` and `DELETE`.
2. Enable Google as an auth provider. Create a Google OAuth web client and use the exact callback URL supplied by Supabase. Add your published app URL to Supabase’s Site URL and redirect allowlist. [Detailed backend instructions](docs/BACKEND.md) include the Google and optional email setup.
3. In Cloudflare, create a **Pages** project connected to this GitHub repository. Select the `main` branch, build command `npm run build`, output directory `dist`, and Node version `24` (`NODE_VERSION=24`). Use the free `*.pages.dev` address; a custom domain is optional and may cost money.
4. Add these build environment variables to the Pages project, then deploy:

   | Variable                  | Value                                                    |
   | ------------------------- | -------------------------------------------------------- |
   | `VITE_SUPABASE_URL`       | The project URL from Supabase                            |
   | `VITE_SUPABASE_ANON_KEY`  | The publishable/anon key, **never** the service-role key |
   | `VITE_EMAIL_AUTH_ENABLED` | `false` unless custom production SMTP is configured      |

5. Set the final `https://…pages.dev` origin in Supabase and Google where required. Redeploy after changing any `VITE_` variable: those values are compiled into the frontend.
6. Complete [the live launch checklist](docs/LAUNCH.md). Real sign-in, database isolation, email delivery if enabled, and provider inference must be checked using actual configured accounts. Automated mocks do not verify third-party production configuration.

No owner-funded AI endpoint, payment SDK, paid font, external image service or analytics service is required. Provider keys are supplied by users at runtime, sent directly to their chosen provider and kept only in tab session storage. See [AI setup and billing](docs/AI-INTEGRATION.md).

### Free does have capacity limits

The plan is designed to avoid an operating bill by staying on free plans, not to promise unlimited capacity. On 1 November 2026, [Supabase Free](https://supabase.com/pricing) lists a 500 MB database, 5 GB egress and 50,000 monthly active users, and may pause inactive projects after one week. These limits apply together; database size or egress can constrain the app before the user limit does. [Cloudflare Pages Free](https://developers.cloudflare.com/pages/platform/limits/) lists 500 builds per month. Check dashboards and current terms before a large launch; keep plans free and do not enable paid upgrades to silently absorb overages. If capacity is reached, reduce access or arrange a deliberate migration.

Google sign-in avoids running an email delivery service. Supabase’s default email sender is for testing and is not suitable for public sign-up. The UI deliberately keeps email authentication off until custom SMTP is ready.

## Structure

```text
src/data/             Original curriculum
src/components/       Learning, writing, settings and account screens
src/lib/learning.ts   Scheduling, queues, streaks and data validation
src/lib/useLearner.ts Local persistence and account lifecycle
src/lib/sync.ts       Compare-and-swap cloud saves and conflict merging
src/lib/ai.ts         User-funded AI providers and validated output
supabase/migrations/ Backend schema, RLS and RPCs
tests/                Unit and curriculum tests
e2e/                  Browser and accessibility tests
docs/                 Deployment, curriculum and security notes
```

Cloud saves retain per-word updates and writing entries across conflicts. Daily counters merge conservatively using the larger count; simultaneous offline study sessions on two devices may undercount their combined activity. This is documented rather than represented as exact multi-device event accounting. Reviews are capped at 30 per session to keep sessions manageable; additional due words remain available in the next session.

Verbum is not affiliated with VCAA. Its fictional examples are learning material, not quotations from set texts or guaranteed high-scoring exam answers. AI feedback is optional guidance, not an assessment mark.
