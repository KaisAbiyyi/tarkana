# Tarkana Quality and Security Standards

> **For agentic workers:** REQUIRED READ BEFORE CODING. These standards apply to Codex, Claude Code, GitHub Copilot, and human contributors. If these rules conflict with an implementation shortcut, the shortcut loses.

## Required Reading Order

Before editing code, read:

1. `docs/prd.md`
2. `docs/implementation-master-plan.md`
3. This file
4. The `README.md` in the relevant `docs/0*-*/` workstream folder
5. The `implementation-plan.md` in the relevant workstream folder
6. The `requirements-and-constraints.md` in the relevant workstream folder
7. The `task-checklist.md` in the relevant workstream folder

## Product Constraints

- This repository is web-only.
- Android is a separate project and is not implemented here.
- The app is not an IQ test and must not claim to be one.
- The app must not make clinical, medical, diagnostic, or formal academic assessment claims.
- Web and Android may share Supabase, but this repo owns only web implementation.
- Admin panel exists only on web.

## SOLID and Clean Code Rules

- Single Responsibility: each module has one reason to change.
- Open/Closed: add new question rules through new rule modules or config, not through fragile condition sprawl.
- Liskov: shared interfaces must not require callers to know hidden subtype behavior.
- Interface Segregation: separate generator, scoring, repository, and UI contracts.
- Dependency Inversion: route handlers depend on services, services depend on repositories, algorithms depend on pure inputs.
- Keep functions small and named by behavior.
- Prefer pure functions for algorithms, scoring, rating, rank, and validation.
- Use explicit return types for exported functions.
- Avoid boolean parameter traps; prefer named option objects.
- Avoid hidden global state in generators.
- Avoid large files. Split when a file owns unrelated responsibilities.
- Do not add abstractions until they remove real duplication or clarify boundaries.
- Do not duplicate formulas. Centralize scoring, rank, and difficulty constants.

## Defensive Algorithm Rules

- Treat all client input as hostile.
- Validate enum values, UUIDs, counts, indexes, time values, selected answers, and challenge states.
- Clamp or reject impossible values rather than letting formulas produce misleading output.
- Use exhaustive handling for question types, challenge types, ranks, and difficulty bands.
- Generated questions must pass validation before being persisted.
- A valid generated question must have exactly one correct answer.
- Choices must be unique after normalization.
- Time spent must be checked against server-side session state and question time limit.
- Score, rating delta, correctness, streak bonus, and suspicious flags are computed on the server.
- Session transitions must be explicit: created, in_progress, completed, abandoned, suspicious.
- Finish logic must be idempotent for already completed sessions.
- Seeds must be stored for every generated question.
- Randomness must be seedable for audit and tests.

## Security Rules

- Use Supabase Auth for authentication.
- Do not store passwords.
- Do not log tokens, cookies, session secrets, OAuth data, or raw Authorization headers.
- Do not expose `DATABASE_URL` or Supabase service role keys to client code.
- Do not import `$env/dynamic/private` into client components.
- Keep privileged code in `$lib/server`.
- Enforce auth and role checks on the server, not only in UI.
- Use Row Level Security for user-owned data.
- Admin operations require both authenticated session and admin role.
- Leaderboard must not expose email.
- Session history is owner-only unless accessed by admin route.
- Reject mutation attempts where `user_id` does not match the authenticated user.
- Correct answers are not sent to client before submit.
- Admin rule config must be validated before activation.
- Suspicious sessions must not count toward leaderboard.
- Error messages shown to users must not leak internals, SQL details, or secret config.

## Data Privacy Rules

Allowed data:

- Display name.
- Email for authentication only.
- Supabase auth identifier.
- Challenge session, answer, score, rating, rank, and history data.

Disallowed data:

- Location.
- Contacts.
- Camera.
- Audio.
- Personal files.
- Health data.
- Formal academic records.

UI copy must use product-safe wording:

- Use: Logic Rating, Reasoning Score, Rank Progress, Challenge Accuracy, Category Mastery.
- Avoid: Real IQ, diagnosis, clinical score, official intelligence test.

## Testing Rules

Every feature must include the smallest useful test set that catches real regressions.

Required test categories:

- Generator unit tests for every rule.
- RuleValidator tests for invalid, ambiguous, and duplicate-choice cases.
- Scoring tests for all multiplier bands and bonus boundaries.
- Rating/rank tests for every threshold.
- Server service tests for ownership and role checks.
- Route tests or integration tests for protected pages and APIs.
- Playwright tests for challenge flow and critical pages.

Use table-driven tests for formulas:

```ts
const cases = [
	{ accuracy: 100, expected: 150 },
	{ accuracy: 90, expected: 100 },
	{ accuracy: 80, expected: 60 },
	{ accuracy: 70, expected: 30 },
	{ accuracy: 69, expected: 0 }
];
```

Use deterministic seeds for generator tests:

```ts
const question = generateNumberSequenceQuestion({
	seed: 'number-sequence-arithmetic-easy-001',
	difficulty: 'easy'
});
```

## UI Quality Rules

All meaningful UI work must be verified with browser-use or Playwright.

Required loop:

1. Implement the UI change.
2. Run the app locally.
3. Open the target page in browser-use or Playwright.
4. Capture desktop screenshot.
5. Capture mobile screenshot.
6. Inspect layout, overlap, contrast, empty states, loading states, error states, and interaction states.
7. Fix issues.
8. Repeat screenshots until the screen is acceptable.
9. Add or update Playwright coverage for the critical behavior.

Minimum viewport checks:

```text
Desktop: 1440x900
Tablet: 768x1024
Mobile: 390x844
```

Neo brutalism UI constraints:

- High contrast.
- Clear typography.
- Strong borders.
- Hard shadows without blur.
- Large, explicit buttons.
- Visible focus states.
- Rank badges with clear shape and text.
- No text overlap.
- No tiny tap targets.
- No interaction that depends only on color.
- Cards may be bold, but repeated data must remain scannable.

## Accessibility Rules

- Every interactive control must have accessible text or an aria label.
- Forms must have labels, validation messages, and keyboard access.
- Timer must be visible and understandable without color alone.
- Challenge choices must be reachable by keyboard.
- Focus order must follow visual order.
- Admin tables must remain readable and navigable.
- Contrast must be checked during screenshot review.

## Database Rules

- Use Drizzle schema as the source for database shape.
- Use explicit indexes for lookup-heavy columns.
- Store timestamps with timezone semantics where appropriate.
- Use enums or constrained text for stable finite values.
- Use JSONB only where rule configuration genuinely needs flexible shape.
- Validate JSONB with TypeScript schemas before writing.
- Avoid destructive migrations without a written compatibility note.
- Add migration notes for schema changes that affect Android compatibility.

## Review Checklist

Before marking work complete, confirm:

- The PRD requirement is addressed.
- The relevant workstream checklist item is checked.
- No Android-specific code or docs were added.
- No server-only import is used in client code.
- No secret or correct answer leaks to the browser.
- Tests cover normal and invalid paths.
- UI has screenshot evidence when UI changed.
- Admin access is enforced server-side.
- User-owned data is scoped by authenticated user.
- Leaderboard excludes email and suspicious sessions.
- `npm.cmd run check`, `npm.cmd run lint`, and relevant tests pass.

