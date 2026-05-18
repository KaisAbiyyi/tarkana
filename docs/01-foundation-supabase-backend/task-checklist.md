# Foundation Task Checklist

Use this checklist as the implementation tracker for Workstream 1.

## Setup

- [x] Read `docs/prd.md`.
- [x] Read `docs/implementation-master-plan.md`.
- [x] Read `docs/quality-security-standards.md`.
- [x] Read this folder's `README.md`.
- [x] Confirm this work is web-only and does not add Android code.
- [x] Inspect current `src/lib/server/db/schema.ts`.
- [x] Inspect current `drizzle.config.ts`.
- [x] Confirm required env vars are documented in `.env.example`.

## Database

- [x] Replace scaffold `task` schema with Tarkana tables.
- [x] Add user role values.
- [x] Add question type values.
- [x] Add challenge type values.
- [x] Add session status values.
- [x] Add difficulty band values.
- [x] Add rank constants.
- [x] Add indexes for leaderboard queries.
- [x] Add indexes for history queries.
- [x] Add indexes for admin filtering.
- [x] Generate Drizzle migration.
- [x] Review generated SQL.
- [x] Document any database compatibility implication for Android's separate project.

## Auth and Access Control

- [x] Add server env validation.
- [x] Add Supabase server auth handling in `hooks.server.ts`.
- [x] Add `requireUser`.
- [x] Add `requireProfile`.
- [x] Add `requireAdmin`.
- [x] Add `assertOwner`.
- [x] Add profile provisioning on first login.
- [x] Add default user profile values.
- [x] Add server layout guard for authenticated routes.
- [x] Add server layout guard for admin routes.

## RLS and Security

- [x] Draft RLS policies for user-owned profile data.
- [x] Draft RLS policies for sessions.
- [x] Draft RLS policies for questions and answers.
- [x] Draft RLS policies for admin-managed data.
- [x] Confirm leaderboard query omits email.
- [x] Confirm user mutation routes reject `user_id` spoofing.
- [x] Confirm admin mutation routes reject non-admin users.
- [x] Confirm raw SQL errors are not exposed to browser.

## Repositories and Services

- [x] Add profile repository.
- [x] Add session repository.
- [x] Add leaderboard repository.
- [x] Add admin repository.
- [x] Add dashboard service.
- [x] Add history service.
- [x] Add leaderboard service.
- [x] Add profile service.
- [x] Add admin service.
- [x] Add consistent API success/error envelope.

## Tests

- [x] Test unauthenticated access rejection.
- [x] Test user role rejection for admin.
- [x] Test admin role access.
- [x] Test owner mismatch rejection.
- [x] Test profile provisioning defaults.
- [x] Test dashboard defaults for new user.
- [x] Test history returns only user's sessions.
- [x] Test leaderboard excludes suspicious sessions.
- [x] Test leaderboard does not include email.
- [x] Test profile update rejects protected fields.

## Verification

- [x] Run `npm.cmd run check`.
- [x] Run `npm.cmd run lint`.
- [x] Run focused unit tests for platform services.
- [x] Run `npm.cmd run test:unit -- --run`.
- [x] Run `npm.cmd run test:e2e`.
- [x] Run `npm.cmd run build`.
- [x] Record any known limitation in this checklist before handoff.

## Handoff Notes

- Live Supabase RLS validation with real user/admin seeded accounts was not run because the local `.env` contains placeholder Supabase values.
- Apply `docs/01-foundation-supabase-backend/rls-policies.sql` after running the generated Drizzle migration against the real Supabase database.
- Replace placeholder `.env` values with real `DATABASE_URL`, `PUBLIC_SUPABASE_URL`, and `PUBLIC_SUPABASE_ANON_KEY` before using auth or database-backed routes.
