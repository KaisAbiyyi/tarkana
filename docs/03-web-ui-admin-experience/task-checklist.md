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
- [x] Browser-check dashboard desktop.
- [ ] Browser-check dashboard mobile.
- [x] Browser-check challenge desktop.
- [x] Browser-check challenge mobile.
- [x] Browser-check result desktop.
- [ ] Browser-check result mobile.
- [x] Browser-check history desktop.
- [ ] Browser-check history mobile.
- [x] Browser-check leaderboard desktop.
- [ ] Browser-check leaderboard mobile.
- [x] Browser-check profile desktop.
- [ ] Browser-check profile mobile.

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

- On June 20, 2026, the authenticated round-preparation experience was refined into a three-step arena loadout flow. Focused Vitest and Playwright coverage verifies the 5/10/20-question session contract, every mode, rapid release/selection changes, native radio keyboard behavior, Enter activation, loading lockout, duplicate-submission prevention, retry-safe creation failure, route/API synchronization, and reduced motion. Final screenshots were captured at all 11 requested viewports from 320x568 through 1920x1080 with no horizontal overflow or clipped selected cards.

- On June 19, 2026, the landing page received a final structural layout repair. Playwright verified the pre-start, running, correct, incorrect, timeout, reset, keyboard, mobile-menu, and reduced-motion states at 11 viewports from 320×568 through 1920×1080. The final sweep found no horizontal overflow, connector/text collision, start-card/answer collision, clipped focal shadows, container-edge drift, unequal category-card heights, or stale GSAP transforms.
- Browser screenshots captured for landing desktop/mobile and auth desktop/mobile with no console errors.
- Protected dashboard/admin redirects were verified for unauthenticated access.
- On June 6, 2026, Google OAuth login and the authenticated dashboard, quick challenge, result, history, leaderboard, and profile flows were verified in Chrome with seeded active categories, rules, and configs.
- A normal user opening `/admin` now receives a verified `403 Admin access is required` response instead of a generic 500.
- On June 6, 2026, symbol challenges were upgraded to accessible SVG primitives for directional triangles, circle, square, triangle, diamond, and star. Live Chrome verification covered correct/incorrect feedback, streak reset/increment, and accumulated session score.
- The challenge UI was visually checked at 1440x900, 768x1024, and 390x844. No horizontal overflow or console errors were found; selected, feedback, timer, and reduced-motion states are covered by component and Playwright tests.
- Authenticated dashboard/result/history/leaderboard/profile mobile screenshots and live admin management pages still require a dedicated pass and an admin account.

