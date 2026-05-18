# Tarkana Web Implementation Master Plan

> **For agentic workers:** REQUIRED READ BEFORE CODING: `docs/prd.md`, this file, `docs/quality-security-standards.md`, and the README plus plan file inside the workstream folder you are implementing. This repository is web-only. Do not implement Android here.

**Goal:** Build the Tarkana ranked logic challenge web application using SvelteKit, Supabase, Drizzle ORM, Tailwind CSS, and Playwright-verified UI flows.

**Architecture:** This repository owns the web app and its independent web server logic. Android is a separate project and may use the same Supabase project, but this repo must not contain Android screens, Android plans, or Android-specific client assumptions. Supabase PostgreSQL is the shared source of truth, while all web challenge validation, scoring, route protection, admin behavior, and UI flows are implemented independently in this SvelteKit codebase.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, Tailwind CSS 4, Drizzle ORM, Supabase PostgreSQL/Auth, Vitest, Playwright, Vercel.

---

## Scope Correction

The PRD is shared product context, but implementation in this repository is limited to the web app.

In scope for this repo:

- SvelteKit web application.
- Supabase Auth integration for web.
- Web server-side challenge APIs and service layer.
- Drizzle database schema, migrations, and query layer for web-owned functionality.
- Procedural challenge generation used by the web app.
- Scoring, rating, rank, leaderboard, history, and profile features.
- Web-only admin panel and question rule management.
- Playwright and browser-use visual verification for every UI workflow.

Out of scope for this repo:

- Android Java app.
- Android XML UI.
- Android networking/auth implementation.
- Android local storage/session handling.
- Android-specific backend adapters.
- Cross-repo release tasks for Android.

Shared contract with Android:

- Both projects can use the same Supabase project and database.
- Database tables, enum values, and public data contracts must remain stable and documented.
- This web repo must not assume it controls Android deployment cadence.
- Breaking database changes require migration notes and compatibility review.

## Three Workstreams

### 1. Foundation, Supabase, and Server Platform

Folder: `docs/01-foundation-supabase-backend/`

Owner focus:

- Supabase Auth integration for web.
- Drizzle schema and migrations.
- Row Level Security planning.
- Server-only repositories and services.
- Profile provisioning and role checks.
- Dashboard, history, leaderboard, profile, and admin data access.
- API response contracts and server validation boundaries.

Primary risk:

- Leaking private data or allowing users to read/write records outside their ownership.

Primary success condition:

- Authenticated web users can only access their own private data, admins can access admin routes, and all database access has explicit validation and RLS alignment.

### 2. Challenge Engine, Scoring, and Ranking

Folder: `docs/02-challenge-engine-scoring/`

Owner focus:

- Procedural generators for number sequence, symbol pattern, mini deduction, and memory pattern.
- Deterministic seed handling.
- Choice generation and rule validation.
- ChallengeBuilder and adaptive difficulty.
- Server-side answer validation.
- Scoring, rating, rank, streak, suspicious session detection.
- Unit and property-style tests around generators and scoring.

Primary risk:

- Generator produces invalid questions, exposes correct answers before submit, or calculates score inconsistently.

Primary success condition:

- Every generated question has exactly one correct answer, can be reconstructed from seed and metadata, and is scored only through server-side logic.

### 3. Web UI, Admin, and Product Experience

Folder: `docs/03-web-ui-admin-experience/`

Owner focus:

- Landing, auth, dashboard, challenge, result, history, leaderboard, profile, and admin routes.
- Neo brutalism design system and reusable Svelte components.
- Responsive desktop and mobile web layout.
- Accessibility and usability requirements.
- UI state handling for loading, empty, error, success, and restricted access.
- Playwright/browser-use screenshot iteration.

Primary risk:

- UI looks acceptable in one viewport but breaks in challenge flow, mobile layout, or admin forms.

Primary success condition:

- All critical web flows are usable, responsive, accessible, and verified with screenshot-based browser review.

## Workstream Boundaries

Foundation owns:

- Database tables, enums, indexes, RLS, and server repositories.
- Web auth lifecycle.
- Access control primitives.
- Server response types for dashboard/history/leaderboard/profile/admin.

Challenge Engine owns:

- Domain algorithms for generation, scoring, rating, and suspicious detection.
- Challenge session state transitions.
- Correct-answer confidentiality until answer submission.
- Deterministic tests and seed reconstruction.

Web UI owns:

- Routes, components, styling, client interaction, and visual QA.
- Form UX and validation feedback.
- Admin workflow screens.
- Browser screenshot evidence.

Shared files must be edited carefully:

- `src/lib/shared/**` may be used for pure constants and type definitions that are safe for the client.
- `src/lib/server/**` must stay server-only and must never be imported by client components.
- `src/routes/**/+server.ts` and `src/routes/**/+page.server.ts` are server boundaries.
- `src/routes/**/+page.svelte` must not contain secrets, correct answers for active questions, or server-only imports.

## Integration Order

1. Establish schema, auth, role, and RLS baseline.
2. Implement challenge domain model and generator tests with no UI dependency.
3. Implement start/submit/finish challenge server flow.
4. Implement dashboard/history/leaderboard/profile data services.
5. Build the UI route shell and design primitives.
6. Wire dashboard and challenge flow to server APIs.
7. Add result, history, leaderboard, and profile pages.
8. Add admin panel for categories, rules, configs, and monitoring.
9. Run Playwright unit, integration, and visual review cycles.
10. Harden security, error handling, observability, and deployment docs.

## Non-Negotiable Engineering Rules

- Read the PRD and relevant workstream plan before coding.
- Keep Android out of this repository.
- Use TypeScript strictness and explicit types at service boundaries.
- Keep server-only code inside `$lib/server` or server route files.
- Never send correct answers to the browser before the user submits an answer.
- Never trust client-provided score, correctness, elapsed time, user id, role, or rank.
- Use server-side validation for every mutation.
- Keep data access behind repository/service functions; do not scatter raw SQL across routes.
- Use deterministic generators with seed and metadata stored for audit.
- Add tests before or alongside implementation for algorithms, services, and access control.
- Use Playwright/browser-use screenshots for every meaningful UI screen or major visual change.
- Do not expose email on leaderboard.
- Do not make IQ, clinical, medical, diagnosis, or official intelligence-test claims.
- Protect admin routes with server-side role checks, not UI hiding alone.
- Preserve privacy-safe product language.

## Definition of Done

A feature is done only when all applicable checks pass:

- Requirement is traceable to `docs/prd.md`.
- Implementation follows the relevant workstream plan.
- Unit tests cover normal, boundary, and invalid input behavior.
- Server mutations validate auth, ownership, and role.
- Correct answer remains unavailable to the client before submit.
- Database queries are scoped by authenticated user or admin role.
- UI has loading, empty, error, and success states.
- Responsive UI has been reviewed at desktop and mobile widths.
- Playwright/browser-use screenshots were captured for UI changes.
- `npm run check`, `npm run lint`, relevant Vitest tests, and relevant Playwright tests pass.
- Any known limitation is documented in the related workstream checklist.

## Repo Commands

Use PowerShell on Windows. If `npm` is blocked by PowerShell policy, use `npm.cmd`.

```powershell
npm.cmd run check
npm.cmd run lint
npm.cmd run test:unit -- --run
npm.cmd run test:e2e
npm.cmd run build
```

Use focused commands while developing:

```powershell
npm.cmd run test:unit -- --run src/lib/server/challenge
npm.cmd run test:unit -- --run src/lib/server/scoring
npm.cmd run test:e2e -- --project chromium
```

## File Map Target

The exact implementation may evolve, but agents should converge toward this structure:

```text
src/lib/shared/
  constants/
  types/
  validation/

src/lib/server/
  auth/
  challenge/
  config/
  db/
  leaderboard/
  profile/
  security/
  sessions/

src/lib/components/
  app/
  challenge/
  dashboard/
  forms/
  leaderboard/
  primitives/
  result/

src/routes/
  (public)/
  (app)/
  admin/
  api/
```

If a different SvelteKit route grouping is chosen, document the reason in the related workstream checklist before committing the implementation.

