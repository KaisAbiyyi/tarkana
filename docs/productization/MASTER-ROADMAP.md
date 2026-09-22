# Tarkana Master Productization Roadmap

## North Star

Tarkana should become a product that a user can discover, try immediately, return to daily, share with another person, and use consistently across web and Android while the engineering team can safely ship, observe, and diagnose it.

## P0: Launch-Credible Foundation

### Repository and CI

- [ ] Add web CI for typecheck, formatting, lint, unit tests, build, and critical E2E tests.
- [ ] Add Android CI for unit tests, lint, and build.
- [ ] Add dependency update automation.
- [ ] Add CodeQL or equivalent static security scanning.
- [ ] Add secret scanning workflow where available.
- [ ] Protect `main` with required checks.
- [ ] Require PR workflow for non-trivial changes.
- [ ] Choose one canonical JavaScript package manager and lockfile.
- [ ] Remove duplicate Copilot instruction file.
- [ ] Add repository description, topics, social preview, and badges.
- [ ] Add `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `.env.example`.
- [ ] Make an explicit license decision.

### Security and reliability

- [ ] Rotate any credential that has ever been committed or exposed.
- [ ] Run repository history secret audit.
- [ ] Add RLS integration tests proving cross-user isolation.
- [ ] Add server authorization integration tests for admin-only operations.
- [ ] Add abuse-sensitive endpoint rate limiting.
- [ ] Add idempotency/replay protection where duplicate requests can corrupt state.
- [ ] Confirm challenge completion is idempotent.
- [ ] Confirm correct answers never leak before submission.
- [ ] Standardize API errors without leaking internals.
- [ ] Separate production migrations from application build side effects.

### Operations

- [ ] Add production error tracking.
- [ ] Add structured logging and correlation IDs.
- [ ] Add uptime monitoring around web and health-check function.
- [ ] Track latency and error rate for core challenge endpoints.
- [ ] Add a lightweight incident/runbook document.

## P1: Product Value and Growth

### Activation

- [x] Guest challenge mode.
- [x] Preserve guest result until signup.
- [x] Convert guest state into user-owned state after account creation.
- [x] Make landing-page challenge genuinely playable.
- [x] Reduce time-to-first-challenge.

### Retention

- [ ] Daily Challenge with globally deterministic seed/config.
- [ ] Daily streak.
- [ ] Daily challenge history/calendar.
- [ ] Daily leaderboard.

### Referral and sharing

- [ ] Challenge-a-Friend share links.
- [ ] Same-seed comparison flow.
- [ ] Shareable result cards.
- [ ] OpenGraph previews for result/challenge links.
- [ ] Referral funnel analytics.

### Analytics

- [ ] Install one product analytics platform.
- [ ] Define canonical event naming.
- [ ] Measure acquisition → activation → signup → repeat session → share.
- [ ] Measure D1 and D7 retention when sample size permits.

### Challenge quality

- [ ] Add generator benchmark harness.
- [ ] Add deterministic reconstruction benchmark.
- [ ] Add invalid/ambiguous/duplicate-choice rate measurement.
- [ ] Add generator latency measurement.
- [ ] Publish benchmark methodology and results.

## P1.5: Competitive Product Depth

- [ ] Per-category mastery rating.
- [ ] Adaptive difficulty based on category mastery and recent performance.
- [ ] Weekly leaderboard.
- [ ] Category leaderboard.
- [ ] Rank-tier leaderboard.
- [ ] Initial achievement set.
- [ ] Improved suspicious-session signals and admin review.
- [ ] Admin generator health dashboard.

## P1: Android Production Path

- [ ] Dedicated release signing.
- [ ] Secure signing secret storage.
- [ ] Release build and AAB generation.
- [ ] R8/ProGuard review.
- [ ] Android crash reporting.
- [ ] Deep links for shared challenges.
- [ ] Store-ready app metadata and screenshots.
- [ ] Closed/internal Play Store testing.

## P2: AIMA-Oriented AI Engineering

- [ ] Add AI Coach only after deterministic answer submission.
- [ ] Keep canonical explanation as fallback.
- [ ] Use strict structured outputs.
- [ ] Add prompt/model versioning.
- [ ] Add cost and latency telemetry.
- [ ] Add timeout/retry/circuit-breaker behavior.
- [ ] Build evaluation dataset from deterministic Tarkana questions.
- [ ] Add automated AI response evaluation.
- [ ] Compare models using reproducible eval reports.
- [ ] Add background processing only where latency isolation is useful.

## P2: Fanvue Integration Experiment

- [ ] Research and document exact integration use case before coding.
- [ ] Implement OAuth securely.
- [ ] Handle webhooks idempotently.
- [ ] Create creator-driven challenge/share concept.
- [ ] Provide creator-facing engagement metrics.
- [ ] Keep integration isolated from core Tarkana domain logic.

## P2: Public API and Platform

Only after product usage justifies it:

- [ ] Versioned public endpoints.
- [ ] OpenAPI specification.
- [ ] API rate limits.
- [ ] Idempotency contract.
- [ ] Stable public error schema.

## P3: Explicitly Deferred

Do not build before evidence justifies them:

- social feed;
- direct messaging;
- clans/guilds;
- complex tournament system;
- marketplace;
- subscriptions/payments;
- many new puzzle modes;
- LLM-generated ranked questions;
- realtime multiplayer;
- Kotlin rewrite;
- Kubernetes;
- unnecessary microservices;
- infrastructure added only for résumé keywords.

## Success Criteria for the Program

The productization program is successful when Tarkana can credibly answer all of these questions:

1. Can a new user reach core value quickly?
2. Can the user return for a reason tomorrow?
3. Can the user bring another user into the product?
4. Can the team detect when production breaks?
5. Can the team measure whether a release improved the product?
6. Can the system prove user isolation and score integrity?
7. Can a pull request demonstrate how a change was tested?
8. Can web and Android evolve without breaking each other?
9. Can engineering claims be supported by benchmarks or production evidence?
10. Can an interviewer inspect the repository and see real ownership rather than only feature code?
