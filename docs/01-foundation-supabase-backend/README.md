# Workstream 1: Foundation, Supabase, and Server Platform

> **Required reading:** `docs/prd.md`, `docs/implementation-master-plan.md`, `docs/quality-security-standards.md`, then this folder.

## Mission

Build the web platform foundation that every other workstream depends on: database schema, Supabase Auth, profile provisioning, role checks, RLS alignment, server repositories, API contracts, and data services for dashboard, history, leaderboard, profile, and admin features.

## Ownership

This workstream owns:

- Drizzle schema and migrations.
- Supabase web auth integration.
- Server-side session validation.
- Profile provisioning after first login.
- Role-based access control for admin.
- User-owned data access rules.
- RLS policy documentation and migration SQL.
- Data repositories and server services.
- Safe response DTOs for web UI.
- Web deployment environment requirements.

This workstream does not own:

- Procedural question algorithms.
- Scoring and ranking formulas.
- Svelte visual layout.
- Android implementation.

## Current Repo State

Observed starting point:

- `docs/prd.md` contains the shared product PRD.
- `src/lib/server/db/schema.ts` currently contains only the scaffold `task` table.
- `src/lib/server/db/index.ts` already creates a Drizzle client from `DATABASE_URL`.
- SvelteKit, Tailwind, Drizzle, Vitest, and Playwright are already installed.
- No Supabase web auth client, profile provisioning, or real Tarkana schema exists yet.

## Success Criteria

- Database schema represents PRD MVP entities.
- Authenticated users can access only their own private data.
- Admin routes and admin data require role `admin`.
- Leaderboard never returns email.
- Correct answer storage is server-side and never included in active-question payloads.
- Web server logic is independent from Android implementation.
- Database contracts that Android may share are documented.
- All platform services have unit or integration tests around access control.

## Documents in This Folder

- `requirements-and-constraints.md`: exact requirements, constraints, and security boundaries.
- `implementation-plan.md`: detailed implementation sequence and target files.
- `task-checklist.md`: trackable task list for workers.

