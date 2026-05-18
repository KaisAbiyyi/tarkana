# Agent Operating Rules

This file is the canonical instruction source for Codex, Claude Code, GitHub Copilot, and any other coding agent working in this repository.

## Mandatory First Step

Before writing or editing code, read these files in order:

1. `docs/prd.md`
2. `docs/implementation-master-plan.md`
3. `docs/quality-security-standards.md`
4. The relevant workstream folder under `docs/`

Relevant workstream folders:

- `docs/01-foundation-supabase-backend/`
- `docs/02-challenge-engine-scoring/`
- `docs/03-web-ui-admin-experience/`

## Hard Scope Boundary

This repository is web-only.

Do not implement:

- Android Java code.
- Android XML layouts.
- Android auth flow.
- Android networking layer.
- Android local storage.
- Android-specific documentation as implementation plan.

The PRD mentions Android because the product is shared, but Android is implemented in a separate project. This web repository may document shared database compatibility only.

## Required Development Behavior

- Follow SOLID, clean code, defensive programming, and explicit service boundaries.
- Keep code small, typed, testable, and easy to review.
- Prefer pure functions for generation, scoring, rating, and rank logic.
- Keep server-only logic under `src/lib/server` or server route files.
- Never expose correct answers before answer submission.
- Never trust client-provided score, correctness, user id, role, rank, or elapsed time.
- Validate all input at server boundaries.
- Protect private routes with server-side session checks.
- Protect admin routes with server-side admin role checks.
- Keep email out of leaderboard responses and UI.
- Do not add medical, clinical, IQ-test, or diagnosis language.

## Required UI Verification

If a task touches UI, repeat this loop until the result is visually acceptable:

1. Run the app.
2. Open the changed route with browser-use or Playwright.
3. Capture desktop screenshot.
4. Capture mobile screenshot.
5. Inspect overlap, spacing, contrast, responsive layout, focus states, empty states, loading states, and error states.
6. Fix issues.
7. Capture screenshots again.
8. Add or update Playwright tests for behavior.

Do not claim UI work is done without browser-based verification.

## Required Commands

Use PowerShell-compatible commands. Prefer `npm.cmd` if `npm` is blocked.

```powershell
npm.cmd run check
npm.cmd run lint
npm.cmd run test:unit -- --run
npm.cmd run test:e2e
npm.cmd run build
```

Run focused tests while working, then run the broader checks before completion.

## Planning Discipline

- Update the relevant `task-checklist.md` when implementing a planned item.
- If implementation deviates from the plan, document why in the relevant checklist.
- Do not silently change database contracts that Android may share.
- Do not skip security checks for speed.
- Do not add broad abstractions until the duplication is real and repeated.

