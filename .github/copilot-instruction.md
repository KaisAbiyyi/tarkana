# Tarkana Agent Instructions

This repository is the SvelteKit web implementation of Tarkana. The PRD is shared product context, but Android is implemented in a separate project.

## Mandatory Reading Before Coding

Before writing or editing code, read these files in order:

1. `docs/prd.md`
2. `docs/implementation-master-plan.md`
3. `docs/quality-security-standards.md`
4. `docs/agent-operating-rules.md`
5. The relevant workstream folder:
   - `docs/01-foundation-supabase-backend/`
   - `docs/02-challenge-engine-scoring/`
   - `docs/03-web-ui-admin-experience/`

Do not code from memory or assumptions if the relevant plan exists.

## Hard Scope Boundary

- This repo is web-only.
- Do not implement Android Java, Android XML, Android auth, Android networking, or Android local storage here.
- Web and Android may share Supabase, but this repo owns independent web server logic and web UI only.
- Admin panel is web-only.

## Required Engineering Quality

- Use SOLID principles and clean code.
- Keep files focused and small.
- Prefer pure functions for generators, scoring, rating, rank, and validation.
- Use explicit TypeScript types at module and service boundaries.
- Keep server-only logic inside `src/lib/server` or SvelteKit server files.
- Do not import server-only modules into `.svelte` client components.
- Centralize formulas and constants.
- Avoid broad abstractions until they remove real duplication.
- Write defensive algorithms that reject invalid state.
- Do not trust client-provided score, correctness, user id, role, rank, or elapsed time.

## Security Requirements

- Use Supabase Auth for authentication.
- Enforce private route access server-side.
- Enforce admin access server-side.
- Use Row Level Security for user-owned data.
- Never expose `DATABASE_URL`, service role keys, auth tokens, cookies, or private env values.
- Never send correct answers to the browser before the user submits an answer.
- Validate all mutation input on the server.
- Leaderboard must not show email.
- Suspicious sessions must not count toward leaderboard.
- Do not leak SQL errors, stack traces, or internal details to users.

## Product Safety Requirements

- Tarkana is not an official IQ test.
- Do not use clinical, medical, diagnosis, or official intelligence-test claims.
- Use product terms from the PRD: Logic Rating, Reasoning Score, Rank Progress, Challenge Accuracy, Category Mastery.

## UI Verification Requirement

If a task changes UI, use browser-use or Playwright repeatedly:

1. Run the app locally.
2. Open the changed route.
3. Capture desktop screenshot.
4. Capture mobile screenshot.
5. Inspect layout, overlap, spacing, contrast, responsive behavior, focus states, loading states, empty states, and error states.
6. Fix issues.
7. Capture screenshots again.
8. Add or update Playwright tests for behavior.

Do not claim UI work is complete without browser-based verification.

## Required Checks

Use PowerShell-compatible commands. Prefer `npm.cmd` if PowerShell blocks `npm`.

```powershell
npm.cmd run check
npm.cmd run lint
npm.cmd run test:unit -- --run
npm.cmd run test:e2e
npm.cmd run build
```

Run focused tests while developing, then run broader checks before handoff.

