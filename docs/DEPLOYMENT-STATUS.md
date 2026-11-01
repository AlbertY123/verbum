# Deployment status

Recorded 1 November 2026. This is a partial deployment record, not a completed launch verification.

## Supabase

- Organisation: Verbum (`wdsmjnkyssekhlbqjlsa`), **Free** plan.
- Project: `adcdhyclapgikylzsaly`, Sydney region, Nano instance; healthy when inspected.
- Applied migrations: `202611010001_learner_state.sql`, then `202611010002_learner_state_privileges.sql`.
- Verified row-level security enabled and forced, with four policies on `public.learner_state`.
- Before migration 002, verified anonymous read/save/delete access denied; authenticated read/save/delete access allowed and direct insert/update access denied. These were database privilege checks, not real-account isolation tests.
- After migration 002, verified authenticated `SELECT` and `DELETE` allowed; `INSERT`, `UPDATE`, `TRUNCATE`, `REFERENCES` and `TRIGGER` denied.
- Saved and verified Site URL `https://verbum-3b5.pages.dev`, with that same exact origin as the sole redirect allowlist entry.

## Cloudflare and sign-in

- The owner authorised the Cloudflare GitHub app for `AlbertY123/verbum` only. The Pages dashboard confirms automatic deployments from `main` are enabled.
- Cloudflare Pages deployment succeeded at [verbum-3b5.pages.dev](https://verbum-3b5.pages.dev/), using `main`, `npm run build` and output directory `dist`.
- Public HTTP checks passed: HTTPS root returned `200`; HTTP returned `301` to HTTPS; an unknown path returned `200` with the app root and the same entry asset, confirming SPA fallback.
- The live response sends all five configured headers from `public/_headers`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and `Content-Security-Policy`, with matching values.
- The deployed JavaScript asset returned `200` with a JavaScript content type and contains the expected Supabase project URL and a publishable key. No credential values are recorded here.
- The live app loads in Chrome and shows Google-only sign-in. The configured public key is correct.
- A live guest study session completed three words (`reinforce`, `convey`, `imply`) with 100% recall. After reload, the app retained daily goal `3/3` and three introduced words. This proves local browser persistence only, not cloud syncing.
- Google Cloud project `verbum-513322` was created; no billing is configured.
- Google Auth registration was created after the owner approved the Google API Services User Data Policy. A production web client was created with the owner's approval and configured in Supabase; the provider is enabled. Its secret is stored only in Supabase, not this repository or the frontend.
- The Google client uses the Pages origin and exact Supabase callback. Requested scopes are limited to OpenID, email and profile. The Google console confirms the external audience is `In production`.
- A real Google login succeeded in Chrome. The app returned to the clean Pages URL, displayed the correct signed-in account and `All progress synced`, and retained the three studied words. Supabase Table Editor confirmed the actual learner row contained those three review records and daily goal 3 at revision 1.
- An authenticated daily-goal update from 3 to 4 reached the live database at revision 2. The original goal was then restored to 3 and verified in the database at revision 3. This verifies an authenticated cloud write independently of the UI status message.
- A separate Incognito session started with no cached progress. The owner chose to skip its Google sign-in, so cross-session restoration remains unverified.
- Same-browser sign-out and returning Google login passed: a temporary account bookmark disappeared from guest mode and returned after signing back into the same account. The bookmark was then removed to restore the original saved-word list. This is not a fresh-browser restoration test.
- Published a stable privacy notice at `/privacy.html`; public HTTP checks confirm it returns `200` with the expected title. Google branding links to the homepage and this privacy notice.
- OAuth callback recovery now handles cancellation, failed/expired codes and missing browser verifiers without discarding guest progress or displaying callback credentials. Commit `72be516` was pushed to `main`. Validation passed: 54 unit tests, six focused Chromium checks and the production build.
- Commit `50c3f25` simplifies the homepage to daily practice and To learn/Learned collections. Learned means practised at least once, with due reviews shown separately; no progress schema changes were made. Validation passed: 25 browser checks, nine focused checks after review fixes, a final mobile check and the production build. Desktop/mobile and light/dark layouts were inspected.
- Remaining verification includes a second browser session, account A/B isolation, offline progress and retry, and test-account deletion. Optional billed AI calls and real Safari testing have not been performed.
- Keep all hosting plans free. Complete the remaining configuration and real-account checks in [BACKEND.md](BACKEND.md) and [LAUNCH.md](LAUNCH.md).
