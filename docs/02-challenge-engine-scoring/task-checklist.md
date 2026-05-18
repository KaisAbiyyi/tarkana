# Challenge Engine Task Checklist

Use this checklist as the implementation tracker for Workstream 2.

## Setup

- [ ] Read `docs/prd.md`.
- [ ] Read `docs/implementation-master-plan.md`.
- [ ] Read `docs/quality-security-standards.md`.
- [ ] Read this folder's `README.md`.
- [ ] Confirm this work is web-only and does not add Android code.
- [ ] Confirm server-only generated question type is separate from client-safe DTO.

## Generator Foundation

- [ ] Add challenge domain types.
- [ ] Add active question DTO without correct answer.
- [ ] Add deterministic seeded RNG.
- [ ] Add RNG tests.
- [ ] Add answer normalization helpers.
- [ ] Add choice generator.
- [ ] Test correct answer inclusion.
- [ ] Test duplicate choice rejection.
- [ ] Add RuleValidator.
- [ ] Test ambiguous question rejection.
- [ ] Test missing explanation rejection.
- [ ] Test missing seed rejection.

## Question Generators

- [ ] Add number sequence generator.
- [ ] Test arithmetic sequence.
- [ ] Test geometric sequence.
- [ ] Test square number sequence.
- [ ] Test Fibonacci-like sequence.
- [ ] Test alternating sequence.
- [ ] Test increasing difference sequence.
- [ ] Add symbol pattern generator.
- [ ] Test symbol rotation.
- [ ] Test alternating symbol.
- [ ] Test repeating cycle.
- [ ] Test shape order.
- [ ] Test growing count.
- [ ] Test mirrored sequence.
- [ ] Add mini deduction generator.
- [ ] Test comparison chain.
- [ ] Test object ordering.
- [ ] Test simple elimination.
- [ ] Test true/false clue.
- [ ] Test position reasoning.
- [ ] Add memory pattern generator.
- [ ] Test symbol recall.
- [ ] Test position recall.
- [ ] Test sequence recall.
- [ ] Test missing element recall.
- [ ] Test reverse sequence recall.

## Challenge Assembly

- [ ] Add DifficultyResolver.
- [ ] Test rating boundary 0.
- [ ] Test rating boundary 499.
- [ ] Test rating boundary 500.
- [ ] Test rating boundary 999.
- [ ] Test rating boundary 1000.
- [ ] Test rating boundary 1499.
- [ ] Test rating boundary 1500.
- [ ] Test rating boundary 1999.
- [ ] Test rating boundary 2000.
- [ ] Add ChallengeBuilder.
- [ ] Test configured question count.
- [ ] Test active mode filtering.
- [ ] Test inactive rule exclusion.
- [ ] Test mixed challenge distribution.
- [ ] Test fallback failure when not enough valid rules exist.

## Scoring and Rating

- [ ] Add question scoring.
- [ ] Test correct answer multiplier.
- [ ] Test wrong answer multiplier.
- [ ] Test time expired multiplier.
- [ ] Test 75-100 percent time band.
- [ ] Test 50-74 percent time band.
- [ ] Test 25-49 percent time band.
- [ ] Test 1-24 percent time band.
- [ ] Add session score.
- [ ] Test 100 percent accuracy bonus.
- [ ] Test 90-99 percent accuracy bonus.
- [ ] Test 80-89 percent accuracy bonus.
- [ ] Test 70-79 percent accuracy bonus.
- [ ] Test below 70 percent accuracy bonus.
- [ ] Test streak bonus at 3.
- [ ] Test streak bonus at 5.
- [ ] Test streak bonus at 10.
- [ ] Add rating update.
- [ ] Test every rating delta band.
- [ ] Add rank resolver.
- [ ] Test every rank threshold.
- [ ] Test promotion detection.

## Anti-Cheat and Session Flow

- [ ] Add suspicious session detection.
- [ ] Test negative time rejection.
- [ ] Test too-long time rejection.
- [ ] Test impossible response time flag.
- [ ] Test duplicate answer rejection.
- [ ] Test out-of-order answer rejection.
- [ ] Add start challenge service.
- [ ] Add submit answer service.
- [ ] Add finish challenge service.
- [ ] Make finish idempotent.
- [ ] Ensure correct answer is hidden until finish or submitted review.

## API and Verification

- [ ] Add `/api/challenge/start`.
- [ ] Add `/api/challenge/submit`.
- [ ] Add `/api/challenge/finish`.
- [ ] Test unauthenticated start rejection.
- [ ] Test submit ignores client-provided correctness.
- [ ] Test finish updates rating server-side.
- [ ] Run `npm.cmd run check`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run focused unit tests.
- [ ] Run `npm.cmd run build`.

