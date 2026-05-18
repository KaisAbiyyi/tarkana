# Challenge Engine Task Checklist

Use this checklist as the implementation tracker for Workstream 2.

## Setup

- [x] Read `docs/prd.md`.
- [x] Read `docs/implementation-master-plan.md`.
- [x] Read `docs/quality-security-standards.md`.
- [x] Read this folder's `README.md`.
- [x] Confirm this work is web-only and does not add Android code.
- [x] Confirm server-only generated question type is separate from client-safe DTO.

## Generator Foundation

- [x] Add challenge domain types.
- [x] Add active question DTO without correct answer.
- [x] Add deterministic seeded RNG.
- [x] Add RNG tests.
- [x] Add answer normalization helpers.
- [x] Add choice generator.
- [x] Test correct answer inclusion.
- [x] Test duplicate choice rejection.
- [x] Add RuleValidator.
- [x] Test ambiguous question rejection.
- [x] Test missing explanation rejection.
- [x] Test missing seed rejection.

## Question Generators

- [x] Add number sequence generator.
- [x] Test arithmetic sequence.
- [x] Test geometric sequence.
- [x] Test square number sequence.
- [x] Test Fibonacci-like sequence.
- [x] Test alternating sequence.
- [x] Test increasing difference sequence.
- [x] Add symbol pattern generator.
- [x] Test symbol rotation.
- [x] Test alternating symbol.
- [x] Test repeating cycle.
- [x] Test shape order.
- [x] Test growing count.
- [x] Test mirrored sequence.
- [x] Add mini deduction generator.
- [x] Test comparison chain.
- [x] Test object ordering.
- [x] Test simple elimination.
- [x] Test true/false clue.
- [x] Test position reasoning.
- [x] Add memory pattern generator.
- [x] Test symbol recall.
- [x] Test position recall.
- [x] Test sequence recall.
- [x] Test missing element recall.
- [x] Test reverse sequence recall.

## Challenge Assembly

- [x] Add DifficultyResolver.
- [x] Test rating boundary 0.
- [x] Test rating boundary 499.
- [x] Test rating boundary 500.
- [x] Test rating boundary 999.
- [x] Test rating boundary 1000.
- [x] Test rating boundary 1499.
- [x] Test rating boundary 1500.
- [x] Test rating boundary 1999.
- [x] Test rating boundary 2000.
- [x] Add ChallengeBuilder.
- [x] Test configured question count.
- [x] Test active mode filtering.
- [x] Test inactive rule exclusion.
- [x] Test mixed challenge distribution.
- [x] Test fallback failure when not enough valid rules exist.

## Scoring and Rating

- [x] Add question scoring.
- [x] Test correct answer multiplier.
- [x] Test wrong answer multiplier.
- [x] Test time expired multiplier.
- [x] Test 75-100 percent time band.
- [x] Test 50-74 percent time band.
- [x] Test 25-49 percent time band.
- [x] Test 1-24 percent time band.
- [x] Add session score.
- [x] Test 100 percent accuracy bonus.
- [x] Test 90-99 percent accuracy bonus.
- [x] Test 80-89 percent accuracy bonus.
- [x] Test 70-79 percent accuracy bonus.
- [x] Test below 70 percent accuracy bonus.
- [x] Test streak bonus at 3.
- [x] Test streak bonus at 5.
- [x] Test streak bonus at 10.
- [x] Add rating update.
- [x] Test every rating delta band.
- [x] Add rank resolver.
- [x] Test every rank threshold.
- [x] Test promotion detection.

## Anti-Cheat and Session Flow

- [x] Add suspicious session detection.
- [x] Test negative time rejection.
- [x] Test too-long time rejection.
- [x] Test impossible response time flag.
- [x] Test duplicate answer rejection.
- [x] Test out-of-order answer rejection.
- [x] Add start challenge service.
- [x] Add submit answer service.
- [x] Add finish challenge service.
- [x] Make finish idempotent.
- [x] Ensure correct answer is hidden until finish or submitted review.

## API and Verification

- [x] Add `/api/challenge/start`.
- [x] Add `/api/challenge/submit`.
- [x] Add `/api/challenge/finish`.
- [x] Test unauthenticated start rejection.
- [x] Test submit ignores client-provided correctness.
- [x] Test finish updates rating server-side.
- [x] Run `npm.cmd run check`.
- [x] Run `npm.cmd run lint`.
- [x] Run focused unit tests.
- [x] Run `npm.cmd run build`.

