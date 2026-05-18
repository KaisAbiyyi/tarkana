# Web UI, Admin, and Product Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. UI tasks require browser-use or Playwright screenshot iteration before completion.

**Goal:** Build the full Tarkana web product experience with responsive, accessible, neo brutalism UI.

**Architecture:** Route groups separate public, authenticated app, and admin areas. Reusable components live under `src/lib/components`. Page server loads and actions call server services; Svelte components render safe DTOs only.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, Tailwind CSS 4, Playwright.

---

## Target File Structure

```text
src/lib/components/primitives/Button.svelte
src/lib/components/primitives/Card.svelte
src/lib/components/primitives/Input.svelte
src/lib/components/primitives/Badge.svelte
src/lib/components/primitives/ProgressBar.svelte
src/lib/components/app/AppShell.svelte
src/lib/components/app/PublicShell.svelte
src/lib/components/dashboard/StatTile.svelte
src/lib/components/dashboard/RecentSessions.svelte
src/lib/components/challenge/ChallengeTimer.svelte
src/lib/components/challenge/ChoiceList.svelte
src/lib/components/challenge/QuestionPanel.svelte
src/lib/components/challenge/MemoryRevealPanel.svelte
src/lib/components/result/ResultSummary.svelte
src/lib/components/result/QuestionReviewList.svelte
src/lib/components/leaderboard/LeaderboardTable.svelte
src/lib/components/admin/AdminTable.svelte
src/lib/components/admin/RuleEditor.svelte
src/lib/components/admin/ChallengeConfigEditor.svelte

src/routes/+page.svelte
src/routes/auth/login/+page.svelte
src/routes/auth/register/+page.svelte
src/routes/auth/callback/+server.ts
src/routes/(app)/+layout.svelte
src/routes/(app)/dashboard/+page.server.ts
src/routes/(app)/dashboard/+page.svelte
src/routes/(app)/challenge/+page.server.ts
src/routes/(app)/challenge/+page.svelte
src/routes/(app)/result/[sessionId]/+page.server.ts
src/routes/(app)/result/[sessionId]/+page.svelte
src/routes/(app)/history/+page.server.ts
src/routes/(app)/history/+page.svelte
src/routes/(app)/leaderboard/+page.server.ts
src/routes/(app)/leaderboard/+page.svelte
src/routes/(app)/profile/+page.server.ts
src/routes/(app)/profile/+page.svelte
src/routes/admin/+layout.svelte
src/routes/admin/+page.server.ts
src/routes/admin/+page.svelte
src/routes/admin/categories/+page.server.ts
src/routes/admin/categories/+page.svelte
src/routes/admin/question-rules/+page.server.ts
src/routes/admin/question-rules/+page.svelte
src/routes/admin/challenge-configs/+page.server.ts
src/routes/admin/challenge-configs/+page.svelte
src/routes/admin/sessions/+page.server.ts
src/routes/admin/sessions/+page.svelte
```

Tests:

```text
src/routes/+page.svelte.e2e.ts
src/routes/auth/auth.e2e.ts
src/routes/(app)/dashboard/dashboard.e2e.ts
src/routes/(app)/challenge/challenge.e2e.ts
src/routes/(app)/result/result.e2e.ts
src/routes/(app)/leaderboard/leaderboard.e2e.ts
src/routes/admin/admin.e2e.ts
```

## Task Sequence

### Task 1: Design Foundation

Expand `src/routes/layout.css`.

Add:

- Tailwind import.
- CSS custom properties for color tokens.
- base font, background, text color.
- focus-visible style.
- utility classes for hard shadow and thick border if useful.

Rules:

- Keep styles readable and not one-color dominated.
- No decorative gradients as the core design.
- Focus state must be obvious.

Validation:

```powershell
npm.cmd run check
```

### Task 2: Primitive Components

Create:

- Button.
- Card.
- Input.
- Badge.
- ProgressBar.

Rules:

- Components accept typed props.
- Components expose accessible labels.
- Components support disabled/loading/error states where applicable.
- Do not put cards inside cards.

Validation:

```powershell
npm.cmd run test:unit -- --run src/lib/components
```

### Task 3: Shell Layouts

Create PublicShell and AppShell.

PublicShell:

- product name.
- login/register links.
- minimal public navigation.

AppShell:

- dashboard, challenge, history, leaderboard, profile links.
- logout action.
- admin link only if profile role is admin.
- mobile-friendly navigation.

Rules:

- Admin link visibility is not the security boundary.
- Server layout still enforces role.

### Task 4: Landing Page

Replace default `src/routes/+page.svelte`.

Content:

- product name.
- tagline.
- short value proposition.
- challenge modes.
- CTA to register/login.
- disclaimer: not an official IQ test.

Rules:

- No IQ claim.
- No diagnosis claim.
- First viewport must signal Tarkana clearly.

Browser verification:

- desktop screenshot at 1440x900.
- mobile screenshot at 390x844.
- fix overlap or text clipping.

### Task 5: Auth Pages

Create login, register, and callback handling.

Requirements:

- email/password login.
- email/password register.
- Google login button.
- logout action in app shell.
- clear form errors.
- loading state.

Rules:

- Do not store tokens in localStorage.
- Use Supabase auth flow through server-safe integration.

Browser verification:

- login desktop/mobile.
- register desktop/mobile.
- error state screenshot.

### Task 6: Dashboard Page

Create dashboard server load and page.

Data:

- rank.
- rating.
- total completed.
- best score.
- average accuracy.
- average solve time.
- strongest category.
- weakest category.
- recent sessions.
- mode selection.
- start challenge.

States:

- new user default.
- populated user.
- loading transition.
- service error.

Browser verification:

- empty desktop/mobile.
- populated desktop/mobile.

### Task 7: Challenge Page

Create challenge page and components.

Features:

- challenge type/mode selection entry.
- active question display.
- timer.
- choice selection.
- submit answer.
- progress indicator.
- memory reveal/hide state.
- expired time state.
- no previous-question navigation in ranked mode.

Rules:

- UI receives only `ActiveQuestionDto`.
- UI does not compute trusted score.
- UI does not contain correct answer before submit.
- Submit button disabled until one answer is selected or timer expires.

Browser verification:

- active number question.
- active symbol question.
- memory reveal state.
- expired state.
- mobile interaction.

### Task 8: Result Page

Create result page.

Data:

- final score.
- correct/wrong count.
- accuracy.
- average solve time.
- rating change.
- rank progress.
- promotion state.
- strongest/weakest category.
- question review.

Rules:

- Correct answer appears only in completed result review.
- Result explanation must be readable on mobile.

Browser verification:

- normal result desktop/mobile.
- rank promotion desktop/mobile.

### Task 9: History Page

Create history page.

Requirements:

- latest sessions first.
- pagination.
- session summary rows/cards.
- open detail result.
- empty state for no sessions.

Rules:

- Data comes from server load scoped to authenticated user.
- No other user's sessions are visible.

### Task 10: Leaderboard Page

Create leaderboard page.

Requirements:

- position.
- display name.
- rank.
- rating.
- average accuracy.
- total completed.
- empty state.

Rules:

- Do not render email.
- Suspicious sessions excluded server-side.
- UI copy must not imply official intelligence ranking.

Browser verification:

- desktop table.
- mobile responsive layout.

### Task 11: Profile Page

Create profile page.

Requirements:

- display name edit form.
- auth provider display.
- rank.
- rating.
- basic account settings.

Rules:

- Users cannot edit role, rating, rank, or email.
- Validate display name length and allowed characters.
- Show success and error states.

### Task 12: Admin Dashboard

Create admin layout and overview page.

Requirements:

- category count.
- active rules count.
- challenge configs count.
- recent sessions.
- suspicious sessions count.
- navigation to admin modules.

Rules:

- Server layout enforces admin.
- Non-admin route access returns redirect or forbidden state.

Browser verification:

- admin desktop/mobile.
- forbidden state for non-admin.

### Task 13: Admin Category Management

Create category management UI.

Fields:

- name.
- slug.
- description.
- active status.

Rules:

- slug is unique.
- inactive categories are not used by ChallengeBuilder.
- show validation errors inline.

### Task 14: Admin Question Rule Management

Create rule management UI.

Fields:

- category.
- rule type.
- difficulty min.
- difficulty max.
- time limit.
- config JSON editor or structured form.
- active status.

Rules:

- Validate JSON before submit.
- Warn before activating invalid config.
- Do not allow active rule with impossible difficulty range.

### Task 15: Admin Challenge Config Management

Create challenge config UI.

Fields:

- name.
- challenge type.
- question count.
- mode distribution.
- difficulty distribution.
- active status.

Rules:

- question count must be positive.
- difficulty distribution must sum to 100 when explicitly set.
- mode distribution must reference active modes.

### Task 16: Admin Session Monitoring

Create session monitoring UI.

Data:

- session id.
- display name.
- challenge type.
- score.
- accuracy.
- suspicious flag.
- created time.

Rules:

- Admin monitoring may show operational user identifiers if needed, but leaderboard must not.
- Do not expose secrets or auth tokens.

### Task 17: Playwright E2E Coverage

Add critical tests:

- protected route redirects unauthenticated user.
- dashboard default state renders.
- start challenge button begins flow.
- answer can be selected and submitted.
- result page renders score and review.
- leaderboard does not contain email-like strings.
- admin route rejects normal user.

### Task 18: Visual QA Pass

Run app and capture screenshots with browser-use or Playwright for:

- landing.
- login.
- dashboard.
- challenge.
- result.
- history.
- leaderboard.
- profile.
- admin.

Fix:

- overlap.
- clipped text.
- unclear focus state.
- low contrast.
- broken mobile layout.
- confusing empty state.

Repeat until acceptable.

### Task 19: Final Verification

Run:

```powershell
npm.cmd run check
npm.cmd run lint
npm.cmd run test:unit -- --run
npm.cmd run test:e2e
npm.cmd run build
```

Expected:

- Type check passes.
- Lint passes.
- Unit tests pass.
- E2E tests pass.
- Build passes.
- Screenshot review completed for every changed UI route.

