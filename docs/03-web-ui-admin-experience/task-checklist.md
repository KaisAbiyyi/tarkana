# Web UI and Admin Task Checklist

Use this checklist as the implementation tracker for Workstream 3.

## Setup

- [ ] Read `docs/prd.md`.
- [ ] Read `docs/implementation-master-plan.md`.
- [ ] Read `docs/quality-security-standards.md`.
- [ ] Read this folder's `README.md`.
- [ ] Confirm this work is web-only and does not add Android code.
- [ ] Inspect current `src/routes/+page.svelte`.
- [ ] Inspect current `src/routes/+layout.svelte`.
- [ ] Inspect current `src/routes/layout.css`.

## Design System

- [ ] Add global design tokens.
- [ ] Add visible focus styles.
- [ ] Add Button component.
- [ ] Add Card component.
- [ ] Add Input component.
- [ ] Add Badge component.
- [ ] Add ProgressBar component.
- [ ] Test primitive component states where practical.

## Layouts and Public Pages

- [ ] Add PublicShell.
- [ ] Add AppShell.
- [ ] Replace default landing page.
- [ ] Add IQ disclaimer to landing page.
- [ ] Add login page.
- [ ] Add register page.
- [ ] Add Google login action.
- [ ] Add logout action.
- [ ] Add auth error states.
- [ ] Browser-check landing desktop.
- [ ] Browser-check landing mobile.
- [ ] Browser-check auth desktop.
- [ ] Browser-check auth mobile.

## Authenticated User Pages

- [ ] Add dashboard server load.
- [ ] Add dashboard page.
- [ ] Add dashboard empty state.
- [ ] Add dashboard populated state.
- [ ] Add challenge page.
- [ ] Add timer UI.
- [ ] Add choice list UI.
- [ ] Add memory reveal UI.
- [ ] Add expired question UI.
- [ ] Add result page.
- [ ] Add question review UI.
- [ ] Add history page.
- [ ] Add leaderboard page.
- [ ] Add profile page.
- [ ] Browser-check dashboard desktop/mobile.
- [ ] Browser-check challenge desktop/mobile.
- [ ] Browser-check result desktop/mobile.
- [ ] Browser-check history desktop/mobile.
- [ ] Browser-check leaderboard desktop/mobile.
- [ ] Browser-check profile desktop/mobile.

## Admin Pages

- [ ] Add admin layout.
- [ ] Add admin overview.
- [ ] Add category management page.
- [ ] Add question rule management page.
- [ ] Add challenge config management page.
- [ ] Add session monitoring page.
- [ ] Add forbidden/redirect state for non-admin.
- [ ] Browser-check admin overview desktop/mobile.
- [ ] Browser-check category management desktop/mobile.
- [ ] Browser-check rule management desktop/mobile.
- [ ] Browser-check challenge config desktop/mobile.
- [ ] Browser-check forbidden state.

## Playwright Tests

- [ ] Test protected route redirects unauthenticated user.
- [ ] Test dashboard default state.
- [ ] Test start challenge flow.
- [ ] Test answer selection.
- [ ] Test answer submission.
- [ ] Test result page.
- [ ] Test leaderboard email absence.
- [ ] Test admin route forbidden for normal user.

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

- [ ] Run `npm.cmd run check`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run relevant unit/component tests.
- [ ] Run relevant Playwright tests.
- [ ] Run `npm.cmd run build`.
- [ ] Record screenshot locations or browser verification notes before handoff.

