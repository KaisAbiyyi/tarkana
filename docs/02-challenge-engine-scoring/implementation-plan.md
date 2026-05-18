# Challenge Engine, Scoring, and Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax for tracking in `task-checklist.md`.

**Goal:** Build deterministic, testable challenge generation and server-side scoring for the web app.

**Architecture:** Pure domain modules generate and validate questions. Server services use those modules to create sessions, submit answers, finish sessions, and persist results. Client-facing DTOs never contain correct answers before answer submission.

**Tech Stack:** TypeScript, SvelteKit server routes, Drizzle repositories, Vitest.

---

## Target File Structure

```text
src/lib/server/challenge/random/seeded-rng.ts
src/lib/server/challenge/types.ts
src/lib/server/challenge/normalization.ts
src/lib/server/challenge/choice-generator.ts
src/lib/server/challenge/rule-validator.ts
src/lib/server/challenge/difficulty-resolver.ts
src/lib/server/challenge/challenge-builder.ts
src/lib/server/challenge/generators/number-sequence-generator.ts
src/lib/server/challenge/generators/symbol-pattern-generator.ts
src/lib/server/challenge/generators/mini-deduction-generator.ts
src/lib/server/challenge/generators/memory-pattern-generator.ts
src/lib/server/scoring/scoring.ts
src/lib/server/scoring/rating.ts
src/lib/server/scoring/rank.ts
src/lib/server/scoring/suspicious-session.ts
src/lib/server/sessions/start-challenge-service.ts
src/lib/server/sessions/submit-answer-service.ts
src/lib/server/sessions/finish-challenge-service.ts
src/routes/api/challenge/start/+server.ts
src/routes/api/challenge/submit/+server.ts
src/routes/api/challenge/finish/+server.ts
```

Tests:

```text
src/lib/server/challenge/random/seeded-rng.spec.ts
src/lib/server/challenge/choice-generator.spec.ts
src/lib/server/challenge/rule-validator.spec.ts
src/lib/server/challenge/difficulty-resolver.spec.ts
src/lib/server/challenge/challenge-builder.spec.ts
src/lib/server/challenge/generators/number-sequence-generator.spec.ts
src/lib/server/challenge/generators/symbol-pattern-generator.spec.ts
src/lib/server/challenge/generators/mini-deduction-generator.spec.ts
src/lib/server/challenge/generators/memory-pattern-generator.spec.ts
src/lib/server/scoring/scoring.spec.ts
src/lib/server/scoring/rating.spec.ts
src/lib/server/scoring/rank.spec.ts
src/lib/server/scoring/suspicious-session.spec.ts
src/lib/server/sessions/start-challenge-service.spec.ts
src/lib/server/sessions/submit-answer-service.spec.ts
src/lib/server/sessions/finish-challenge-service.spec.ts
```

## Task Sequence

### Task 1: Domain Types

Create server challenge types for internal generated questions and safe client questions.

Required separation:

```ts
type GeneratedQuestion = {
	questionType: QuestionType;
	prompt: string;
	choices: string[];
	correctAnswer: string;
	explanation: string;
	difficultyScore: number;
	timeLimitSeconds: number;
	metadata: Record<string, unknown>;
	generatedSeed: string;
};

type ActiveQuestionDto = Omit<GeneratedQuestion, 'correctAnswer' | 'explanation'> & {
	sessionQuestionId: string;
	orderIndex: number;
};
```

Rules:

- `GeneratedQuestion` stays server-side.
- `ActiveQuestionDto` can be sent to browser.
- Result review DTO may include correct answer only after answer is submitted or session is finished.

Validation command:

```powershell
npm.cmd run check
```

### Task 2: Seeded Randomness

Create a deterministic seeded RNG wrapper.

Required behavior:

- Same seed creates same sequence.
- Different seed usually creates different sequence.
- Provide helpers for integer range, shuffle, and pick.
- No `Math.random()` inside generator modules.

Validation command:

```powershell
npm.cmd run test:unit -- --run src/lib/server/challenge/random/seeded-rng.spec.ts
```

### Task 3: Answer Normalization

Create normalization helpers.

Required behavior:

- Trim surrounding whitespace.
- Normalize repeated internal whitespace.
- Compare case-insensitively for textual choices where appropriate.
- Keep symbol choices exact when symbol identity matters.

Use these helpers in RuleValidator and submit answer service.

### Task 4: Choice Generator

Create `choice-generator.ts`.

Required behavior:

- Always includes correct answer.
- Generates plausible distractors from rule context.
- Shuffles choices with seeded RNG.
- Enforces unique normalized choices.
- Returns exactly four choices for MVP unless rule config overrides.

Test cases:

- correct answer included.
- no duplicate choices.
- deterministic with same seed.
- throws clear error when not enough unique choices can be generated.

### Task 5: RuleValidator

Create `rule-validator.ts`.

Validate:

- non-empty prompt.
- allowed question type.
- choices length >= 2.
- exactly one correct choice after normalization.
- explanation non-empty.
- difficulty score positive.
- time limit positive.
- metadata contains rule type.
- generated seed non-empty.

Invalid questions must fail before persistence.

### Task 6: Number Sequence Generator

Create generator for PRD number patterns.

Minimum MVP rule set:

- arithmetic sequence.
- geometric sequence.
- square number.
- Fibonacci-like sequence.
- alternating sequence.
- increasing difference.

Each rule test must assert:

- prompt is clear.
- exactly one correct answer.
- choices are unique.
- explanation names the pattern.
- deterministic output for fixed seed.
- difficulty score is in expected band.

### Task 7: Symbol Pattern Generator

Create generator for PRD symbol patterns.

Minimum MVP rule set:

- symbol rotation.
- alternating symbol.
- repeating cycle.
- shape order.
- growing count.
- mirrored sequence.

Use simple text/symbol representation that works in browser and tests. If visual symbols are used, ensure fallback text is available for accessibility.

### Task 8: Mini Deduction Generator

Create generator for simple clue puzzles.

Minimum MVP rule set:

- comparison chain.
- object ordering.
- simple elimination.
- true/false clue.
- position reasoning.

Rules:

- Generated clue set must have one determinate answer.
- Explanation must show reasoning.
- Avoid culturally specific names or sensitive attributes.

### Task 9: Memory Pattern Generator

Create generator for memory challenges.

Minimum MVP rule set:

- symbol recall.
- position recall.
- sequence recall.
- missing element recall.
- reverse sequence recall.

Rules:

- Active question DTO may include memorization payload and reveal duration.
- Correct answer must still be hidden before submit.
- UI will handle hide-after-delay behavior, but server must define the challenge payload.
- Do not make medical or clinical memory claims.

### Task 10: Difficulty Resolver

Create `difficulty-resolver.ts`.

Implement rating distribution from PRD:

- 0-499: 60 easy, 40 medium, 0 hard.
- 500-999: 40 easy, 50 medium, 10 hard.
- 1000-1499: 20 easy, 60 medium, 20 hard.
- 1500-1999: 10 easy, 50 medium, 40 hard.
- 2000+: 0 easy, 40 medium, 60 hard.

Tests must cover every boundary:

- 0
- 499
- 500
- 999
- 1000
- 1499
- 1500
- 1999
- 2000

### Task 11: ChallengeBuilder

Create `challenge-builder.ts`.

Input:

- challenge config.
- active categories.
- active rules.
- user rating.
- optional selected mode.
- seed.

Output:

- ordered list of validated generated questions.

Rules:

- Respect configured question count.
- Respect active rule availability.
- Use difficulty distribution by percentage.
- Use mode distribution for mixed challenge.
- Retry invalid generation with bounded attempts.
- Fail with clear server error if not enough valid questions can be generated.

### Task 12: Scoring

Create `src/lib/server/scoring/scoring.ts`.

Implement:

- question score.
- time multiplier.
- accuracy bonus.
- streak bonus.
- session score.
- average solve time.
- accuracy percentage.

Tests must cover:

- every time multiplier band.
- correct answer and wrong answer.
- time expired.
- every accuracy bonus band.
- streak thresholds 3, 5, 10.
- no double counting of streak bonus unless intentionally documented.

### Task 13: Rating and Rank

Create `rating.ts` and `rank.ts`.

Rules:

- Rating cannot go below 0 unless product explicitly changes this rule.
- Unranked is used before first completed challenge.
- Rank after session follows final rating.
- Promotion flag is true only when rank tier increases.

Tests must cover every rank threshold.

### Task 14: Suspicious Session Detection

Create `suspicious-session.ts`.

Inputs:

- answer times.
- tab switch count if available.
- server session timestamps.
- question order.
- request anomaly flags.

MVP suspicious flags:

- negative time.
- time greater than time limit plus small grace.
- response too fast under defined threshold.
- answer for already answered question.
- answer outside current order in ranked mode.

### Task 15: Start Challenge Service

Create `start-challenge-service.ts`.

Responsibilities:

- validate authenticated user.
- load profile rating.
- load active config and rules.
- build questions.
- create challenge session and session questions.
- return first active question without correct answer.

Rules:

- Do not create sessions for unauthenticated users.
- Do not expose correct answers.
- Store generated questions before returning response.

### Task 16: Submit Answer Service

Create `submit-answer-service.ts`.

Responsibilities:

- validate authenticated user.
- verify session ownership.
- verify question belongs to session.
- verify question is current unanswered question.
- validate time spent.
- compare selected answer server-side.
- compute question score server-side.
- persist answer.
- return next active question or completion-ready status.

Rules:

- User cannot change answer after submit.
- User cannot go back in ranked mode.
- Client-provided correctness is ignored.

### Task 17: Finish Challenge Service

Create `finish-challenge-service.ts`.

Responsibilities:

- validate authenticated user.
- verify session ownership.
- aggregate answers.
- compute total score, accuracy, average time, rating delta, and rank.
- flag suspicious if needed.
- update profile rating/rank.
- mark session complete.
- return result review.

Rules:

- Idempotent if session is already completed.
- Use transaction for session completion and profile update.
- Include correct answers in result review only after session is finished.

### Task 18: API Routes

Create routes:

- `POST /api/challenge/start`
- `POST /api/challenge/submit`
- `POST /api/challenge/finish`

Rules:

- Use service layer.
- Validate request JSON.
- Return safe JSON envelope.
- Never include stack traces in response.

### Task 19: Final Verification

Run:

```powershell
npm.cmd run check
npm.cmd run lint
npm.cmd run test:unit -- --run src/lib/server/challenge src/lib/server/scoring src/lib/server/sessions
npm.cmd run build
```

Expected:

- Type check passes.
- Lint passes.
- All generator, scoring, and session service tests pass.
- Build passes.

