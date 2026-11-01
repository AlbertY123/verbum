# Live launch checks

The repository contains a working frontend, backend migrations and automated checks. A live launch is complete only after the external services below are configured and verified. Do not describe unconfigured account sign-in or untested provider calls as verified.

## Required operator setup

- [x] Create Supabase on the Free plan; choose a suitable region.
- [x] Apply `supabase/migrations/202611010001_learner_state.sql`, then `supabase/migrations/202611010002_learner_state_privileges.sql`, skipping migrations already applied. The second restricts authenticated table privileges to `SELECT` and `DELETE`.
- [x] Configure Google OAuth using `docs/BACKEND.md`; keep email disabled until custom SMTP works.
- [x] Create Cloudflare Pages from this repository, build `npm run build`, output `dist`, Node 24.
- [x] Supply the public Supabase environment variables; never deploy a service-role key or owner AI key.
- [x] Configure the final production URL and exact auth redirect allowlist. Remove unnecessary preview/local redirects before broad launch.
- [x] Check the deployment sends the headers in `public/_headers`, serves HTTPS and returns the SPA on reload.

Configuration above was verified on 1 November 2026. See [deployment evidence and outstanding live checks](DEPLOYMENT-STATUS.md).

Cloudflare Pages supplies [SPA fallback by default](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering) when there is no top-level `404.html`. This project uses hash routes and does not need a catch-all rewrite that could interfere with static assets.

## Real-account checks

1. In an incognito browser, create/sign into account A via Google. Complete onboarding and a study session. Refresh and confirm the state persists.
2. Open account A on a second device/browser. Confirm its name, daily goal, reviews and writing load. Make a change and verify it is saved after a refresh elsewhere.
3. Sign into a different account B. Confirm it cannot see A’s progress. In a controlled test, use B’s authenticated client to select A’s record; expect no rows. The save and delete RPCs must reject A’s ID when called by B.
4. Disconnect the network during practice. Confirm device progress survives reload, a sync warning appears, and Retry sync uploads the changes once online.
5. Export a backup, then delete a test account through Preferences. Confirm its auth user and learner_state row are gone, and sign-in creates a fresh account rather than restoring deleted cloud data.
6. Connect your own OpenRouter account. Select a model; request one short piece of feedback and one word pack. Confirm the right account receives the charge (or free-model limit), and disconnect.
7. Optionally connect a restricted OpenAI project key, select a model, request feedback, and check its API usage. Do not use a shared operator key. Test an expired key and an exhausted balance; errors should be understandable and core practice should keep working.
8. Test Chrome/Edge and Safari on a real phone. Confirm keyboard focus, mobile navigation, typing, dark mode and touch controls. Automated Chromium tests are not a substitute for Safari testing.

## Operations

- Keep Supabase and Cloudflare on free plans; review quotas before promoting the app. Service suspension at free-tier limits is possible.
- Export backups during the pilot and before schema changes. Supabase Free does not include the same backup guarantees as paid plans.
- Review the in-app privacy notice against the actual operator, region and provider configuration before collecting public users. No analytics or ads are currently shipped.
- Review AI-generated word packs before adding them. The app validates structure, not factual truth.
- Use the lockfile and automated checks for dependency updates. Do not commit `.env.local`, provider credentials or database secrets.

## Evidence supplied by automated tests

Unit tests check curriculum integrity, scheduling and daily quotas, practice activity, conservative data merging, AI response validation, provider isolation and revision conflicts. Browser tests check complete study, library, guided writing, inline typing, word choice and sentence repair flows, device persistence, mobile layout, accessibility and a mocked Supabase fresh-device restore. Live Supabase RLS, Google OAuth configuration and billed AI calls still need the steps above.
