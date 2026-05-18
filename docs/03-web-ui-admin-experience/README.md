# Workstream 3: Web UI, Admin, and Product Experience

> **Required reading:** `docs/prd.md`, `docs/implementation-master-plan.md`, `docs/quality-security-standards.md`, then this folder.

## Mission

Build the complete Tarkana web experience: landing page, authentication screens, dashboard, challenge flow, result review, history, leaderboard, profile, admin panel, and reusable neo brutalism UI components.

## Ownership

This workstream owns:

- SvelteKit routes and layouts.
- Public and authenticated web pages.
- Admin web pages.
- Neo brutalism design system.
- Responsive web behavior.
- Form UX and validation feedback.
- Loading, empty, error, and success states.
- Playwright/browser-use screenshot verification.
- UI-focused E2E tests.

This workstream does not own:

- Database schema.
- Core challenge generation algorithms.
- Scoring formulas.
- Android implementation.

## Current Repo State

Observed starting point:

- `src/routes/+page.svelte` is still default SvelteKit welcome content.
- `src/routes/+layout.svelte` only imports `layout.css` and favicon.
- `src/routes/layout.css` only imports Tailwind.
- There is a demo Playwright route under `src/routes/demo`.
- No real Tarkana UI exists yet.

## Success Criteria

- Landing page explains Tarkana without IQ or clinical claims.
- Auth routes support email/password and Google flow through Supabase.
- Dashboard displays default values for new users.
- Challenge flow is clear, timed, and cannot navigate backward in ranked mode.
- Result page displays score, accuracy, rating change, rank progress, and review.
- History shows only user-owned sessions.
- Leaderboard omits email and excludes suspicious sessions.
- Profile can update display name only.
- Admin panel manages categories, rules, configs, and monitoring.
- Every UI route has responsive desktop and mobile screenshot review.

## Documents in This Folder

- `requirements-and-constraints.md`: page, UX, accessibility, and visual QA requirements.
- `implementation-plan.md`: detailed implementation sequence and target files.
- `task-checklist.md`: trackable task list for workers.

