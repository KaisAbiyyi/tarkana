# Tarkana Master Productization Roadmap

## North Star

Tarkana should become a product that a user can discover, try immediately, return to daily, share with another person, and use consistently across web and Android while the engineering team can safely ship, observe, and diagnose it.

## P0: Launch-Credible Foundation

### Repository and CI

- [x] Add web CI for typecheck, formatting, lint, unit tests, build, and critical E2E tests.
- [x] Add Android CI for unit tests, lint, and build.
- [ ] Add dependency update automation.
- [x] Add CodeQL or equivalent static security scanning.
- [ ] Add secret scanning workflow where available.
- [x] Protect `main` with required checks.
- [x] Require PR workflow for non-trivial changes.
- [x] Choose one canonical JavaScript package manager and lockfile.
- [x] Remove duplicate Copilot instruction file.
- [x] Add repository description, topics, social preview, and badges.
- [x] Add `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `.env.example`.
- [x] Make an explicit license decision.

### Security and reliability

- [x] Rotate any credential that has ever been committed or exposed.
- [x] Run repository history secret audit.
- [x] Add RLS integration tests proving cross-user isolation.
- [x] Add server authorization integration tests for admin-only operations.
- [x] Add abuse-sensitive endpoint rate limiting.
- [x] Add idempotency/replay protection where duplicate requests can corrupt state.
- [x] Confirm challenge completion is idempotent.
- [x] Confirm correct answers never leak before submission.
- [x] Standardize API errors without leaking internals.
- [x] Separate production migrations from application build side effects.

### Operations

- [x] Add production error tracking.
- [x] Add structured logging and correlation IDs.
- [ ] Add uptime monitoring around web and health-check function.
- [ ] Track latency and error rate for core challenge endpoints.
- [x] Add a lightweight incident/runbook document.

## P1: Product Value and Growth

### Activation

- [x] Guest challenge mode.
- [x] Preserve guest result until signup.
- [x] Convert guest state into user-owned state after account creation.
- [x] Make landing-page challenge genuinely playable.
- [x] Reduce time-to-first-challenge.

### Retention

- [x] Daily Challenge with globally deterministic seed/config.
- [x] Daily streak.
- [x] Daily challenge history/calendar.
- [x] Daily leaderboard.

### Referral and sharing

- [x] Challenge-a-Friend share links.
- [x] Same-seed comparison flow.
- [x] Shareable result cards.
- [x] OpenGraph previews for result/challenge links.
- [x] Referral funnel analytics.

### Analytics

- [x] Install one product analytics platform.
- [x] Define canonical event naming.
- [x] Measure acquisition → activation → signup → repeat session → share.
- [ ] Measure D1 and D7 retention when sample size permits.

### Challenge quality

- [x] Add generator benchmark harness.
- [x] Add deterministic reconstruction benchmark.
- [x] Add invalid/ambiguous/duplicate-choice rate measurement.
- [x] Add generator latency measurement.
- [x] Publish benchmark methodology and results.

## P1.5: Competitive Product Depth

> **Status: Complete & Frozen.** Core competitive mechanics (Category Mastery, Adaptive Difficulty, Category/Tier Leaderboards, and Normalized Weekly Leaderboard) are shipped, verified, and merged. P1 competitive product development is now frozen. Further additions are strictly evidence-gated.

- [x] Per-category mastery rating (Milestones P1.10A, P1.10A.1).
- [x] Adaptive difficulty based on category mastery (Milestones P1.10B, P1.10D.1).
- [x] Weekly leaderboard with normalized performance (Milestones P1.10D, P1.10D.1).
- [x] Category leaderboard with provisional gating (Milestone P1.10C).
- [x] Rank-tier leaderboard (Milestone P1.10C).
- [x] Admin generator health dashboard (Milestones P1.8, P1.8.1).
- [ ] Initial achievement set (evidence/retention-gated).
- [ ] Additional suspicious-session/admin-review sophistication (volume/anomaly-gated).

## Android Production Path (Independent Delivery Track)

- [x] Dedicated release signing.
- [x] Secure signing secret storage.
- [x] Release build and AAB generation.
- [x] R8/ProGuard review.
- [x] Android crash reporting.
- [x] Deep links for shared challenges.
- [ ] Store-ready app metadata and screenshots.
- [ ] Closed/internal Play Store testing.

## P2A: AI Coach Foundation

- [ ] Add AI Coach only after deterministic answer submission.
- [ ] Keep canonical explanation as fallback.
- [ ] Use strict structured outputs.

## P2B: AI Evaluation Dataset & Automated Eval Harness

- [ ] Build evaluation dataset from deterministic Tarkana questions.
- [ ] Add automated AI response evaluation.
- [ ] Compare models using reproducible eval reports.

## P2C: AI Model/Prompt Versioning, Cost, Latency & Reliability

- [ ] Add prompt/model versioning.
- [ ] Add cost and latency telemetry.
- [ ] Add timeout/retry/circuit-breaker behavior.
- [ ] Add background processing only where latency isolation is useful.

## Fanvue Integration Experiment (Evidence/Use-Case Gated)

- [ ] Research and document exact integration use case before coding.
- [ ] Implement OAuth securely.
- [ ] Handle webhooks idempotently.
- [ ] Create creator-driven challenge/share concept.
- [ ] Provide creator-facing engagement metrics.
- [ ] Keep integration isolated from core Tarkana domain logic.

## Public API and Platform (Usage Gated)

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
