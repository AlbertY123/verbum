# Backend setup

Verbum uses Supabase Auth and a small PostgreSQL table for private learner state. The bundled curriculum ships with the website rather than being downloaded from the database for every session.

## 1. Create the project

Create a Supabase account and a **Free** organisation/project; choose a nearby region such as Sydney. Keep paid upgrades disabled. Copy the project URL and publishable/anon key into the hosting environment as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These values are public browser configuration. Never use the secret/service-role key in a `VITE_` variable or commit it.

Without these variables Verbum remains usable on the current browser, but account sign-in and cross-device sync are unavailable. Rebuild after changing build-time variables.

## 2. Apply the schema

In the project's SQL Editor run `supabase/migrations/202611010001_learner_state.sql` once. The transaction creates:

- One `learner_state` row per authenticated user, containing state JSON, a revision and a server timestamp.
- Row-level policies allowing each user to access only their own row; no anonymous database access.
- A 1 MiB per-row JSON limit and a foreign key that cascades account deletion.
- `save_learner_state(p_user_id, p_state, p_expected_revision)`, which serialises writes and rejects stale revisions. The client merges concurrent progress and retries rather than silently overwriting another device.
- `delete_own_account(p_user_id)`, an authenticated RPC that can delete only the caller's account. Both RPCs verify that the browser's expected account matches the actual authenticated caller.

No service-role key or custom paid server is required. The migration is versioned; do not rerun an already-applied migration blindly. Apply future migrations in order. [Supabase's row-level security guide](https://supabase.com/docs/guides/database/postgres/row-level-security) explains the policy mechanism.

Direct inserts/updates are not granted to browser clients; writes use the revision-checked RPC. Conflicting word schedules use the most recently reviewed record; writing entries and custom words are merged by ID. Daily counters use the larger recorded value, so concurrent offline activity can be conservatively undercounted rather than double-counted. Preferences and bookmarks use the most recently modified snapshot. This is progress synchronisation, not real-time collaborative editing.

## 3. Configure public sign-in

**Google OAuth is the recommended initial route** because it avoids operating an outbound email service. In the Google Auth Platform console create a project, configure the consent screen/audience, then create a Web application OAuth client. Request only basic identity scopes: `openid`, email and profile. Add the website origin to authorised JavaScript origins. Copy the exact Supabase callback URL from Supabase's Google provider screen into Google's authorised redirect URIs; place the resulting client ID and secret in that Supabase provider screen. The secret belongs in Supabase, not Verbum's frontend environment. Set the Google consent audience to production for public use, or add explicit test users while testing. Follow the [official Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

In Supabase Authentication → URL Configuration set the Site URL to the final HTTPS site URL and allow its exact callback/return URLs, plus `http://127.0.0.1:5173` for local testing if needed. Avoid a broad wildcard for the production domain. Verify the final URL against the app's redirect settings.

## 4. Optional email/password

Enable the email/password UI only after the provider is ready (`VITE_EMAIL_AUTH_ENABLED=true`). Supabase's default mail service is a testing facility: it sends only to project team addresses and currently permits two messages per hour. Public email confirmation and recovery need custom SMTP. See [Supabase's SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

If using email, choose a mail provider whose free plan covers your expected volume, configure its SMTP credentials in Supabase, verify your sender/domain as required, and test confirmation and password recovery with an address outside the project team. Keep email verification enabled. Configure password requirements and rate limits in Supabase. A free mail allowance does not guarantee free operation beyond its limits; a domain may also cost money. Google-only sign-in avoids this requirement.

The app uses PKCE. Confirmation and password recovery links should be opened in the browser that initiated the request. The [password authentication guide](https://supabase.com/docs/guides/auth/passwords) covers confirmation and recovery settings.

## 5. Verify the live backend

Use two test accounts and a clean guest browser:

1. Sign in as account A, complete a lesson, sign out, and confirm the next visitor cannot see A's progress or use A's AI connection.
2. Sign in as A on a second browser and check that progress loads. Make changes in both sessions and check the app's merge behaviour.
3. Sign in as B. Confirm B starts separately and cannot read, overwrite or delete A's `learner_state` row through the API. Check anonymously too.
4. Confirm an oversized state write is rejected and reported to the learner without discarding their local progress.
5. Delete test account B through the app. Confirm the `auth.users` row and associated `learner_state` row are gone, and A is unaffected.
6. If email is enabled, verify confirmation, recovery, invalid credentials, expired links and returning sessions.

The production database was not provisioned during local implementation, so these checks need the owner's configured project. Do not describe live auth/sync as tested until they pass.

## Cost and operations

At the time of implementation, Supabase's [Free plan](https://supabase.com/pricing) includes 500 MB of database storage and 50,000 monthly active users; inactivity can pause a free project. Database size and transfer allowances can bind well before the user-count allowance. Monitor usage and stop new sign-ups or reduce retention rather than upgrade automatically if a zero bill is mandatory. Free hosting has no paid service-level guarantee.

Keep user exports available, take operator backups appropriate to the project, and test restores. Do not put AI keys in state JSON or backups. Review database usage and provider limits before expanding a public launch.
