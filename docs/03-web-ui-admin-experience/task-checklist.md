# Web UI and Admin Task Checklist

Use this checklist as the implementation tracker for Workstream 3.

## Setup

- [x] Read `docs/prd.md`.
- [x] Read `docs/implementation-master-plan.md`.
- [x] Read `docs/quality-security-standards.md`.
- [x] Read this folder's `README.md`.
- [x] Confirm this work is web-only and does not add Android code.
- [x] Inspect current `src/routes/+page.svelte`.
- [x] Inspect current `src/routes/+layout.svelte`.
- [x] Inspect current `src/routes/layout.css`.

## Design System

- [x] Add global design tokens.
- [x] Add visible focus styles.
- [x] Add Button component.
- [x] Add Card component.
- [x] Add Input component.
- [x] Add Badge component.
- [x] Add ProgressBar component.
- [x] Test primitive component states where practical.

## Layouts and Public Pages

- [x] Add PublicShell.
- [x] Add AppShell.
- [x] Replace default landing page.
- [x] Add IQ disclaimer to landing page.
- [x] Add login page.
- [x] Add register page.
- [x] Add Google login action.
- [x] Add logout action.
- [x] Add auth error states.
- [x] Browser-check landing desktop.
- [x] Browser-check landing mobile.
- [x] Browser-check auth desktop.
- [x] Browser-check auth mobile.

## Authenticated User Pages

- [x] Add dashboard server load.
- [x] Add dashboard page.
- [x] Add dashboard empty state.
- [x] Add dashboard populated state.
- [x] Add challenge page.
- [x] Add timer UI.
- [x] Add choice list UI.
- [x] Add memory reveal UI.
- [x] Add expired question UI.
- [x] Add result page.
- [x] Add question review UI.
- [x] Add history page.
- [x] Add leaderboard page.
- [x] Add profile page.
- [ ] Browser-check dashboard desktop/mobile.
- [ ] Browser-check challenge desktop/mobile.
- [ ] Browser-check result desktop/mobile.
- [ ] Browser-check history desktop/mobile.
- [ ] Browser-check leaderboard desktop/mobile.
- [ ] Browser-check profile desktop/mobile.

## Admin Pages

- [x] Add admin layout.
- [x] Add admin overview.
- [x] Add category management page.
- [x] Add question rule management page.
- [x] Add challenge config management page.
- [x] Add session monitoring page.
- [x] Add forbidden/redirect state for non-admin.
- [ ] Browser-check admin overview desktop/mobile.
- [ ] Browser-check category management desktop/mobile.
- [ ] Browser-check rule management desktop/mobile.
- [ ] Browser-check challenge config desktop/mobile.
- [x] Browser-check forbidden state.

## Playwright Tests

- [x] Test protected route redirects unauthenticated user.
- [ ] Test dashboard default state.
- [ ] Test start challenge flow.
- [ ] Test answer selection.
- [ ] Test answer submission.
- [ ] Test result page.
- [ ] Test leaderboard email absence.
- [x] Test admin route forbidden for unauthenticated user.

## Visual QA

- [ ] Capture desktop screenshots for all changed pages.
- [ ] Capture mobile screenshots for all changed pages.
- [ ] Fix text overlap.
- [ ] Fix clipped buttons.
- [ ] Fix broken responsive layout.
- [ ] Fix insufficient contrast.
- [ ] Fix missing focus states.
- [ ] Repeat screenshot pass after fixes.

## Verification

- [x] Run `npm.cmd run check`.
- [x] Run `npm.cmd run lint`.
- [x] Run relevant unit/component tests.
- [x] Run relevant Playwright tests.
- [x] Run `npm.cmd run build`.
- [x] Record screenshot locations or browser verification notes before handoff.

## Verification Notes

- Browser screenshots captured for landing desktop/mobile and auth desktop/mobile with no console errors.
- Protected dashboard/admin redirects were verified for unauthenticated access.
- Authenticated dashboard, challenge, result, history, leaderboard, profile, and admin visual QA still requires a Supabase test user/admin account and seeded active categories/question rules/configs. A test registration attempt returned the safe UI error state from Supabase, so private route screenshots could not be completed in this environment.

