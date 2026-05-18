# Foundation, Supabase, and Server Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax for tracking in `task-checklist.md`.

**Goal:** Establish secure web foundation for auth, database, RLS, repositories, and platform services.

**Architecture:** SvelteKit server hooks own request session state. Server-only repositories wrap Drizzle queries. Route handlers and page server loads call service functions that validate auth, ownership, role, and input before touching data.

**Tech Stack:** SvelteKit, TypeScript, Drizzle ORM, Supabase Auth, PostgreSQL, Vitest.

---

## Target File Structure

Create or modify these files:

```text
src/lib/shared/constants/challenge.ts
src/lib/shared/constants/rank.ts
src/lib/shared/types/auth.ts
src/lib/shared/types/challenge.ts
src/lib/shared/types/dashboard.ts
src/lib/shared/types/leaderboard.ts
src/lib/shared/types/session.ts
src/lib/shared/validation/common.ts
src/lib/server/auth/session.ts
src/lib/server/auth/guards.ts
src/lib/server/auth/profile-provisioning.ts
src/lib/server/config/env.ts
src/lib/server/db/schema.ts
src/lib/server/db/index.ts
src/lib/server/db/repositories/profile-repository.ts
src/lib/server/db/repositories/session-repository.ts
src/lib/server/db/repositories/leaderboard-repository.ts
src/lib/server/db/repositories/admin-repository.ts
src/lib/server/dashboard/dashboard-service.ts
src/lib/server/history/history-service.ts
src/lib/server/leaderboard/leaderboard-service.ts
src/lib/server/profile/profile-service.ts
src/lib/server/admin/admin-service.ts
src/hooks.server.ts
src/routes/api/profile/+server.ts
src/routes/api/dashboard/+server.ts
src/routes/api/history/+server.ts
src/routes/api/leaderboard/+server.ts
src/routes/api/admin/categories/+server.ts
src/routes/api/admin/question-rules/+server.ts
src/routes/api/admin/challenge-configs/+server.ts
src/routes/(app)/+layout.server.ts
src/routes/admin/+layout.server.ts
```

Tests:

```text
src/lib/server/auth/guards.spec.ts
src/lib/server/auth/profile-provisioning.spec.ts
src/lib/server/dashboard/dashboard-service.spec.ts
src/lib/server/history/history-service.spec.ts
src/lib/server/leaderboard/leaderboard-service.spec.ts
src/lib/server/profile/profile-service.spec.ts
src/lib/server/admin/admin-service.spec.ts
```

## Task Sequence

### Task 1: Environment Contract

Create `src/lib/server/config/env.ts` to centralize required private environment variables.

Required variables:

- `DATABASE_URL`
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Rules:

- Private secrets must not be exported to client code.
- If a required server variable is missing, throw during server startup.
- Keep public Supabase values in public env only if they are safe for browser use.

Validation command:

```powershell
npm.cmd run check
```

### Task 2: Shared Constants and Types

Create shared constants for stable domain values:

- user roles: `user`, `admin`
- question types: `number_sequence`, `symbol_pattern`, `mini_deduction`, `memory_pattern`
- challenge types: `quick`, `standard`, `long`, `daily`, `custom`, `mixed`, `mode`
- difficulty bands: `easy`, `medium`, `hard`
- session states: `created`, `in_progress`, `completed`, `abandoned`, `suspicious`
- rank names and rating ranges from PRD

Rules:

- Shared files must contain no secrets.
- Shared files may be imported by client and server.
- Keep formula constants in one place.

Validation command:

```powershell
npm.cmd run test:unit -- --run src/lib/shared
```

### Task 3: Drizzle Schema Replacement

Replace scaffold `task` table with Tarkana schema.

Required tables:

- `users_profile`
- `categories`
- `question_rules`
- `challenge_configs`
- `challenge_sessions`
- `session_questions`
- `session_answers`

Required relationships:

- `users_profile.id` references Supabase auth user id by UUID convention.
- `question_rules.category_id` references `categories.id`.
- `challenge_sessions.user_id` references `users_profile.id`.
- `session_questions.session_id` references `challenge_sessions.id`.
- `session_questions.category_id` references `categories.id`.
- `session_answers.session_question_id` references `session_questions.id`.
- `session_answers.user_id` references `users_profile.id`.

Required indexes:

- `users_profile.display_name`
- `users_profile.rating`
- `categories.slug`
- `question_rules.category_id`
- `question_rules.is_active`
- `challenge_configs.challenge_type`
- `challenge_sessions.user_id`
- `challenge_sessions.created_at`
- `challenge_sessions.is_suspicious`
- `session_questions.session_id`
- `session_questions.order_index`
- `session_answers.session_question_id`
- `session_answers.user_id`

Validation command:

```powershell
npm.cmd run check
npm.cmd run db:generate
```

### Task 4: Auth Session Hook

Create `src/hooks.server.ts`.

Responsibilities:

- Read Supabase session from request cookies.
- Attach trusted user/session info to `event.locals`.
- Provide a safe `locals.getSession()` helper if using Supabase SvelteKit helpers.
- Avoid exposing tokens through load data.

Rules:

- Do not use client-side role values for authorization.
- Route guards must use server locals.

Validation command:

```powershell
npm.cmd run check
```

### Task 5: Auth Guards

Create `src/lib/server/auth/guards.ts`.

Required functions:

- `requireUser(event)`
- `requireProfile(event)`
- `requireAdmin(event)`
- `assertOwner(authenticatedUserId, resourceUserId)`

Behavior:

- `requireUser` rejects unauthenticated access.
- `requireProfile` provisions or loads profile.
- `requireAdmin` rejects non-admin users.
- `assertOwner` rejects mismatched user ids.

Test cases:

- unauthenticated request rejected.
- authenticated user accepted.
- user role rejected from admin.
- admin role accepted.
- owner mismatch rejected.

Validation command:

```powershell
npm.cmd run test:unit -- --run src/lib/server/auth/guards.spec.ts
```

### Task 6: Profile Provisioning

Create `src/lib/server/auth/profile-provisioning.ts`.

Rules:

- Create `users_profile` on first login if missing.
- Default role is `user`.
- Default rating is `0`.
- Default rank is `Unranked` until first completed challenge.
- Default display name uses safe fallback derived from email local part or provider metadata, sanitized.
- Never expose email on leaderboard.

Validation command:

```powershell
npm.cmd run test:unit -- --run src/lib/server/auth/profile-provisioning.spec.ts
```

### Task 7: Repository Layer

Create repositories under `src/lib/server/db/repositories/`.

Rules:

- Repositories receive validated inputs.
- Repositories do not read request cookies.
- Repositories do not decide UI redirects.
- Repositories do not leak raw SQL errors to route handlers.
- Use transactions for multi-write completion flows.

Repository responsibilities:

- profile repository: get, create, update display name, update rating/rank.
- session repository: create session, list history, read result, mark completion.
- leaderboard repository: list non-suspicious users by rating.
- admin repository: CRUD categories, rules, configs, and monitoring queries.

Validation command:

```powershell
npm.cmd run test:unit -- --run src/lib/server/db/repositories
```

### Task 8: Data Services

Create dashboard, history, leaderboard, profile, and admin services.

Service rules:

- Services enforce ownership and role.
- Services shape DTOs for UI.
- Services return default dashboard values for new users.
- Services paginate history and admin lists.
- Services omit email unless the admin monitoring screen explicitly needs it and the PRD allows the context.

Validation command:

```powershell
npm.cmd run test:unit -- --run src/lib/server/dashboard src/lib/server/history src/lib/server/leaderboard src/lib/server/profile src/lib/server/admin
```

### Task 9: API Routes

Create server routes for profile, dashboard, history, leaderboard, and admin data.

Rules:

- Parse search params defensively.
- Validate JSON body shape.
- Use server services only.
- Return consistent JSON envelope:

```ts
type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: { code: string; message: string } };
```

Validation command:

```powershell
npm.cmd run check
npm.cmd run test:unit -- --run src/routes/api
```

### Task 10: RLS Migration Notes

Create RLS migration SQL through Drizzle migration flow or documented SQL file if Drizzle cannot express policy definitions cleanly.

Required policies:

- user profile own read/update.
- session own read.
- question own session read.
- answer own read.
- admin manage category/rule/config.
- leaderboard safe view or safe server query.

Validation:

- Review SQL before applying.
- Test with user and admin seeded accounts.
- Confirm non-owner reads fail.

### Task 11: Web Layout Guards

Create server layouts:

- `src/routes/(app)/+layout.server.ts` requires authenticated user.
- `src/routes/admin/+layout.server.ts` requires admin.

Rules:

- Do not rely on client navigation guard alone.
- Redirect unauthenticated users to login.
- Return safe profile summary to layout.

Validation command:

```powershell
npm.cmd run check
```

### Task 12: Final Verification

Run:

```powershell
npm.cmd run check
npm.cmd run lint
npm.cmd run test:unit -- --run
npm.cmd run build
```

Expected:

- Type check passes.
- Lint passes.
- Unit tests pass.
- Build passes.

