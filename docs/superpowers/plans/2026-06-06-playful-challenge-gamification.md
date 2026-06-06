# Playful Challenge Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render symbolic challenge tokens as accessible visual glyphs and add playful, responsive feedback to the full challenge interaction.

**Architecture:** Stable answer tokens remain unchanged from generator through server submission. A pure shared parser and focused Svelte renderer handle presentation, while challenge-local components own momentum and feedback state without affecting authoritative scoring.

**Tech Stack:** Svelte 5, SvelteKit, TypeScript, inline SVG, Tailwind CSS 4, Vitest Browser, Playwright.

---

## File Structure

- Create `src/lib/shared/presentation/symbols.ts`: parse symbol prompts and label supported tokens.
- Create `src/lib/shared/presentation/symbols.spec.ts`: unit coverage for parser and labels.
- Create `src/lib/components/challenge/SymbolGlyph.svelte`: accessible inline-SVG renderer with text fallback.
- Create `src/lib/components/challenge/SymbolGlyph.svelte.spec.ts`: browser component coverage.
- Create `src/lib/components/challenge/SessionMomentum.svelte`: question progress, streak, and score display.
- Create `src/lib/components/challenge/AnswerFeedback.svelte`: correct/incorrect/completion live feedback.
- Modify `src/lib/components/challenge/QuestionPanel.svelte`: visual sequence rendering.
- Modify `src/lib/components/challenge/ChoiceList.svelte`: tactile visual and token-preserving choices.
- Modify `src/lib/components/challenge/ChallengeTimer.svelte`: urgent timer state.
- Modify `src/lib/components/primitives/ProgressBar.svelte`: animated fill support.
- Modify `src/routes/(app)/challenge/+page.svelte`: feedback, streak, score, and completion state.
- Modify `src/routes/layout.css`: reusable motion and reduced-motion fallbacks.
- Create `src/routes/(app)/challenge/challenge-ui.e2e.ts`: mock-backed UI behavior coverage.
- Modify `docs/03-web-ui-admin-experience/task-checklist.md`: record verification.

### Task 1: Symbol Presentation Contract

- [x] Write parser tests covering a valid triangle sequence, a malformed sequence, a non-symbol prompt, unknown-token labeling, and human-readable triangle labels.
- [x] Run `npm.cmd run test:unit -- --run src/lib/shared/presentation/symbols.spec.ts` and verify failure because the module does not exist.
- [x] Implement `parseSymbolPrompt`, `isVisualSymbolToken`, and `labelSymbolToken` without importing server modules.
- [x] Re-run the focused test and verify it passes.

### Task 2: Accessible Symbol Glyph

- [x] Write a browser component test asserting `triangle-left` renders an SVG with label "Triangle pointing left" and an unknown token renders readable fallback text.
- [x] Run the focused browser test and verify failure because the component does not exist.
- [x] Implement `SymbolGlyph.svelte` using one upward triangle SVG rotated by token direction.
- [x] Re-run the focused component test and verify it passes.

### Task 3: Visual Questions And Choices

- [x] Update `QuestionPanel.svelte` to parse only symbol-pattern prompts and render token tiles with `SymbolGlyph`.
- [x] Update `ChoiceList.svelte` to accept `questionType`, preserve the exact token in `onSelect`, render symbol choices visually, and expose selected state through text and `aria-checked`.
- [x] Add tactile hover, active, selected, focus, and disabled classes without hiding labels.
- [x] Run component tests and `npm.cmd run check`.

### Task 4: Session Momentum And Feedback

- [x] Implement `SessionMomentum.svelte` with progress, streak, and accumulated Reasoning Score.
- [x] Implement `AnswerFeedback.svelte` with polite live regions for correct, incorrect, and completion states.
- [x] Integrate streak, session score, feedback status, and a bounded next-question transition into `+page.svelte`.
- [x] Ensure choices and submit are locked while feedback is shown, and no correct answer enters client state.
- [x] Run `npm.cmd run check` and focused session service tests.

### Task 5: Motion And Responsive Polish

- [x] Add transform/opacity keyframes for question entrance, selection pop, score float, success pulse, progress shimmer, and completion burst.
- [x] Add a `prefers-reduced-motion: reduce` block that removes movement and transition delay.
- [x] Enhance timer urgency and progress fill animation without changing timer semantics.
- [x] Verify no animation class changes layout or prevents keyboard interaction.

### Task 6: Browser Behavior Coverage

- [x] Add a development-only Playwright fixture using the production challenge components so rendering and feedback can be tested deterministically without auth bypass or a correct-answer payload.
- [x] Assert raw tokens are not visibly rendered, glyphs are visible, selection state is preserved, correct feedback is announced, mobile has no horizontal overflow, and reduced motion disables movement.
- [x] Run `npm.cmd run test:e2e -- "src/routes/demo/challenge/challenge-ui.e2e.ts"`.

### Task 7: Browser Visual Verification

- [x] Start the app and open a live authenticated symbol challenge plus deterministic component fixture.
- [x] Capture and inspect desktop 1440x900, tablet 768x1024, and mobile 390x844 states.
- [x] Inspect selected, correct, incorrect, loading, timer urgency, and reduced-motion states; existing global focus styles remain active.
- [x] Fix primitive fallback rendering and verify no overlap, clipping, horizontal scroll, console errors, or interaction regressions.
- [x] Repeat screenshots after fixes.

### Task 8: Final Verification

- [x] Run `npm.cmd run check`.
- [x] Run `npm.cmd run lint`.
- [x] Run `npm.cmd run test:unit -- --run`.
- [x] Run `npm.cmd run test:e2e`.
- [x] Run `npm.cmd run build`.
- [x] Update the UI workstream checklist with desktop/mobile and behavior evidence.
