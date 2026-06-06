# Playful Challenge Gamification Design

## Goal

Make Tarkana's challenge flow feel playful and responsive while preserving its neo-brutalist identity, server-authoritative scoring, accessibility, and answer confidentiality.

The first visible improvement is rendering symbolic question tokens such as `triangle-left` as actual shapes rather than raw implementation strings.

## Product Direction

The selected direction is **playful balanced**:

- Immediate tactile feedback for hover, press, selection, and answer submission.
- Stronger visual momentum through question progress, streaks, and score feedback.
- Lightweight celebrations that support focus rather than interrupting it.
- No mascot, sound system, virtual currency, or large reward economy in this iteration.

Duolingo is a reference for interaction responsiveness and positive reinforcement, not a visual template. Tarkana keeps its bold borders, hard shadows, high contrast, and reasoning-focused product language.

## Symbol Rendering

### Token Contract

Question generation, persistence, validation, and answer submission continue to use stable string tokens such as:

- `triangle-up`
- `triangle-right`
- `triangle-down`
- `triangle-left`

The browser must submit the original token. The visual renderer must never replace or transform the answer value sent to the server.

### Visual Component

Create a focused `SymbolGlyph.svelte` component that accepts:

- `token: string`
- `size: 'sm' | 'md' | 'lg'`
- optional decorative animation state

Known triangle tokens render with inline SVG. Inline SVG is preferred over an icon library because:

- only four directional shapes are required;
- it adds no runtime dependency;
- shape geometry and styling remain under Tarkana's control;
- SVG scales cleanly and supports accessible labeling.

Unknown tokens fall back to readable text, so future generator values do not become invisible.

The component exposes a human-readable label such as "triangle pointing left" to assistive technology. Decorative duplicate glyphs use `aria-hidden`.

### Prompt Parsing

Symbol prompts currently contain presentation and data in one string:

`Find the next symbol: triangle-left | triangle-up | ... | ?`

Add a pure parser in the shared presentation layer. It recognizes the exact symbol prompt prefix and pipe-separated token sequence, returning either:

```ts
type SymbolPrompt = {
	instruction: string;
	tokens: string[];
};
```

or `null` for ordinary text prompts.

`QuestionPanel` uses the parser only for `symbol_pattern`. A recognized prompt renders:

- the instruction as a heading;
- each token in a bordered symbol tile;
- the unknown slot as a visually distinct question tile.

All other prompts retain the current text rendering.

## Challenge Interaction

### Choice Cards

Choice buttons become tactile game controls:

- Hover raises the card and increases its hard shadow.
- Active press moves it down and reduces the shadow.
- Selection applies the accent background, a short scale bounce, and a persistent checked indicator.
- Keyboard focus remains more prominent than hover.
- Disabled choices remain readable and do not animate.

Symbol choices render `SymbolGlyph` prominently with a readable direction label. Non-symbol answers retain text layout.

### Progress And Streak

Add a session status strip above the question:

- animated question progress;
- current question and total;
- current correct-answer streak;
- accumulated in-session Reasoning Score.

The streak begins at zero, increments after a correct answer, and resets after an incorrect or expired answer. It is client presentation only and is not used for authoritative scoring.

The accumulated score is the sum of `scoreEarned` returned by the server. It is also presentation only.

### Answer Feedback

After a server response:

- correct answer shows a green feedback banner, a short success pop, and `+N Reasoning Score`;
- incorrect answer shows a warm error banner and encouraging copy;
- the selected choices remain temporarily disabled;
- the next question appears after a short bounded delay of approximately 650 ms;
- users with reduced motion receive no artificial delay beyond what is needed to read state changes.

The page must not reveal the correct answer during this feedback state.

### Completion

When the final answer is submitted:

- show a brief completion burst made from CSS shapes;
- display "Challenge complete" while the finish request runs;
- navigate to the authoritative result page after completion succeeds.

No third-party confetti package is needed. The effect is small, deterministic, and removed from the accessibility tree.

## Motion System

Define reusable motion classes and keyframes in `src/routes/layout.css`:

- card lift and press;
- selection pop;
- question entrance;
- score float;
- success pulse;
- subtle progress shimmer;
- completion burst.

Motion durations stay between 120 ms and 700 ms. Layout-affecting animation is avoided; use transforms and opacity.

Under `prefers-reduced-motion: reduce`:

- animations and transition durations are effectively disabled;
- transform-based movement is removed;
- all information remains visible through text, color, border, and icon state.

## Accessibility

- Choice buttons retain `role="radio"` and `aria-checked`.
- Symbol direction is available as text to screen readers.
- Feedback uses an `aria-live="polite"` region.
- Correct and incorrect states never rely on color alone.
- Focus order remains question, choices, submit action, then supporting session information.
- Timer and progress continue to expose textual values.
- Touch targets remain at least 44 pixels high.

## Security And Data Boundaries

- No correct answer is added to active-question DTOs or client state.
- The client displays only `isCorrect` and `scoreEarned` returned after submission.
- Score and streak UI do not participate in server calculations.
- Submitted answers remain the exact original choice token.
- No server-only module is imported by Svelte components.

## Files

Create:

- `src/lib/components/challenge/SymbolGlyph.svelte`
- `src/lib/components/challenge/SessionMomentum.svelte`
- `src/lib/components/challenge/AnswerFeedback.svelte`
- `src/lib/shared/presentation/symbols.ts`
- focused tests for symbol parsing and component behavior

Modify:

- `src/lib/components/challenge/QuestionPanel.svelte`
- `src/lib/components/challenge/ChoiceList.svelte`
- `src/lib/components/challenge/ChallengeTimer.svelte`
- `src/lib/components/primitives/ProgressBar.svelte`
- `src/routes/(app)/challenge/+page.svelte`
- `src/routes/layout.css`
- relevant Playwright coverage and workstream checklist

## Verification

Automated:

- parser tests for known, unknown, malformed, and ordinary prompts;
- component tests for visual symbol labels and preserved answer tokens;
- challenge interaction tests for selection, feedback, progress, and no answer leakage;
- existing generator, scoring, and service tests remain green.

Browser:

- desktop at 1440x900;
- tablet at 768x1024;
- mobile at 390x844;
- symbol prompt and symbol choices;
- hover, press, selected, correct, incorrect, expired, loading, and completion states;
- keyboard focus and reduced-motion behavior;
- no overlap, clipping, unexpected horizontal scroll, or console errors.

Required commands:

```powershell
npm.cmd run check
npm.cmd run lint
npm.cmd run test:unit -- --run
npm.cmd run test:e2e
npm.cmd run build
```
