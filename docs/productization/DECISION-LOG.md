# Tarkana Architecture Decision Log (ADR)

> Records significant architectural, product, and legal decisions for Tarkana.

---

## ADR-0001: Software Licensing Strategy

### Status
Accepted (Phase P0.1)

### Context
In Phase P0, a default permissive MIT license was placed in the repository root.

However, Tarkana is transitioning from an exploratory beta into a commercially operated consumer product. The platform contains:
1. Proprietary procedural puzzle and question generators (`src/lib/server/challenge/generators/`).
2. Anti-cheat and anomaly detection heuristics (`src/lib/server/scoring/suspicious-session.ts`).
3. Competitive ELO-style ranking calibration and scoring curves (`src/lib/server/scoring/`).
4. Brand identity, domain logic, and proprietary design system.

Under a permissive MIT license:
- Any competitor or malicious actor can fork the repository, clone the puzzle generation algorithms and anti-cheat mitigations, and run a competing ranked service with zero attribution or revenue share.
- Anti-cheat mechanics and question seed formulas would be legally free for exploit developers to study and circumvent.

### Decision
1. Change the repository license from permissive **MIT** to **Proprietary / All Rights Reserved**.
2. Preserve source code visibility for internal collaborators and authorized auditors.
3. If public source code release is desired in future phases, adopt a **Business Source License (BSL 1.1)** or **AGPL-3.0 (Network Copyleft)** with an explicit exception structure, subject to a future ADR.

### Consequences
- `LICENSE` is updated to Proprietary / All Rights Reserved.
- Unambiguous legal protection for Tarkana's core algorithms, brand, and competitive integrity.
- Third parties cannot freely clone or commercialize Tarkana intellectual property without a written commercial license.

---

## ADR-0002: Daily Challenge Fairness & Determinism Architecture

### Status
Accepted (Phase P1.3)

### Context
Milestone P1.3 introduces Daily Challenges to Tarkana, acting as the foundation for competitive daily leaderboards (P1.4), streaks, and shareable results.
Unlike casual puzzle apps where questions may be client-generated or varied per user, Tarkana is a competitive ranked logic platform. Several critical architectural challenges were identified:
1. **Determinism vs Cheating**: If seeds are easily guessed, clients can generate questions in advance. If questions differ by user rating, leaderboards cannot be fairly ranked.
2. **Timezone Manipulation**: If daily challenges reset at local midnight, users in earlier timezones (UTC+14) would solve puzzles 24 hours before users in UTC-10, enabling answer sharing.
3. **Database Concurrency & Orphans**: Concurrent requests for the same user or guest token could spawn multiple distinct sessions and attempts, violating the single-attempt policy.
4. **Token Security**: Guest users completing daily challenges on mobile browsers must have secure HttpOnly session tokens without double-hashing regressions.

### Decision
1. **HMAC-SHA256 Canonical Seed**: Daily challenge generation uses HMAC-SHA256 with `DAILY_CHALLENGE_SECRET`, `challengeDate` (`YYYY-MM-DD` UTC), `configVersion`, and `generatorVersion`. The server refuses to start in production without an explicit `DAILY_CHALLENGE_SECRET`.
2. **Immutable Snapshot & Canonical English Invariance**: Puzzles are generated once and frozen into `daily_challenges.puzzle_snapshot` in English. Localization must never alter mathematical premises, choices, or scoring weights.
3. **Synchronous UTC Midnight Boundary**: Daily challenges reset worldwide at `00:00:00 UTC` with a live countdown timer.
4. **Atomic Attempt Creation & Concurrency Safety**: Session creation, question insertion, and attempt registration execute inside a single atomic database transaction (`startDailySessionAtomic`). Concurrent start requests resolve safely to the winner's canonical session with zero orphan records.
5. **Competitive Rating Isolation**: Daily challenges award strictly `+0` delta to competitive Logic Rating, isolating ranked ladders from daily puzzle engagement.

### Consequences
- Uncompromising competitive fairness across all global players.
- Rock-solid foundation for Milestone P1.4 Daily Leaderboards.
- Guarantees zero orphan sessions and zero rating exploits.
- Complete alignment with `AGENTS.md` operating contract.

---

## ADR-0003: Category Mastery Architecture & Question-Level Elo Calibration Model

### Status
Accepted (Milestone P1.10A, Calibrated in Milestone P1.10A.1)

### Context
In prior milestones, player skill was represented solely by a single global Logic Rating and a coarse session accuracy-band delta (`calculateRatingDelta`: $\ge 90\% \to +40, \ge 80\% \to +25, \dots$).
However, Tarkana challenges test four distinct cognitive disciplines:
1. `number_sequence` (arithmetic, geometric, recurrences, polynomial series)
2. `symbol_pattern` (spatial rotation, cyclic permutations, mirroring, growing sequences)
3. `mini_deduction` (multi-step deductive logic, order constraints, elimination)
4. `memory_pattern` (visual working memory, recall, order inversion)

A player may be an elite Mastermind in numerical series while being a developing solver in spatial memory.
Applying the coarse session-level rating delta to category mastery would suffer from:
1. **Difficulty Blindness**: An easy session with 90% accuracy would reward the same mastery delta as a hard-mode session with 90% accuracy.
2. **Farming Vulnerability**: High-rated players could play easy mode challenges to artificially inflate mastery.
3. **Inappropriate Penalty Curves**: Missing an intensely difficult question would be penalized as harshly as blundering an obvious question.
4. **Prior Mismatch (P1.10A.1)**: Initializing an unranked player at prior 0 against 600–900 difficulty implied a 1% expected accuracy for entry-level Easy questions.

### Decision

1. **Question-Level Elo Calibration Model**:
   Category Mastery is updated at the individual question level using a difficulty-aware logistic expected-performance model.
   For question $i$ with difficulty rating $D_i$ and player category mastery $R$:
   $$\text{Expected Score } E_i = \frac{1}{1 + 10^{(D_i - R) / 400}}$$
   $$\text{Question Delta } \delta_i = K \times (S_i - E_i)$$
   where $S_i \in \{0, 1\}$ represents answer correctness, and $K$ is the sensitivity factor ($K_{\text{provisional}} = 16$, $K_{\text{established}} = 8$).

2. **Calibrated Difficulty-to-Rating Mapping (Version 2)**:
   Each question's difficulty score maps continuously into Tarkana's rank tier scale:
   - `easy` (scores 100–180): $D_{\text{easy}} = 350 + \frac{\text{score} - 100}{80} \times 300$ (range 350–650, Bronze/Silver boundary).
   - `medium` (scores 200–320): $D_{\text{medium}} = 900 + \frac{\text{score} - 200}{120} \times 600$ (range 900–1500, Gold tier).
   - `hard` (scores 350–520+): $D_{\text{hard}} = 1750 + \min\left(1.5, \frac{\text{score} - 350}{170}\right) \times 800$ (range 1750–2550+, Platinum to Mastermind).

3. **Mathematical Invariant Guarantees**:
   - **Monotonic Reward**: For identical mastery, $\delta_{\text{correct}}(D_{\text{hard}}) > \delta_{\text{correct}}(D_{\text{easy}})$. Harder questions always reward strictly more rating points.
   - **Asymptotic Farming Resistance**: As $R \gg D$, $E \to 1.0$, so $\delta_{\text{correct}} = K(1 - E) \to 0$. High-mastery players gain zero or negligible points from farming easy questions.
   - **Blunder Asymmetry**: For incorrect answers, $\delta_{\text{wrong}} = -K \times E$. Missing an unexpectedly easy question ($E \approx 1$) penalizes $-K$; missing a question far above one's mastery ($E \approx 0$) produces a negligible penalty.
   - **Strict Bounds**: Category mastery is deterministically bounded within $[0, 3000]$.

4. **Provisional Mastery & Calibrated Entry Priors**:
   - When an unranked player first attempts a category, initial mastery initializes from `DEFAULT_UNRANKED_MASTERY_PRIOR = 400` (Bronze Mind midpoint). An entry-level player facing an entry-level Easy question ($D \approx 400$) now has a plausible expected accuracy of $\approx 50\%$.
   - Ranked players inherit $\max(400, R_{\text{logic}})$ as their initial category prior.
   - Category mastery remains **Provisional** until the player completes at least **20 rated questions** and **3 rated sessions** in that category.
   - Provisional mastery drives personal adaptive difficulty (P1.10B) but is excluded from public Category Leaderboards (P1.10C).
   - Rating semantics are versioned via `MASTERY_RATING_VERSION = 2`. Any legacy version 1 records are deterministically recomputed upon backfill.

5. **Centralized Session Eligibility & Claimed-Guest Historical Integrity**:
   - Category mastery mutations are strictly restricted to authenticated, non-suspicious, competitive sessions (`isCompetitiveSessionFilter`: `status = 'completed'`, `isSuspicious = false`, `claimedAt IS NULL`, and competitive types `quick`, `standard`, `long`, `mode`).
   - Claimed guest history (`claimedAt IS NOT NULL`) remains visible in personal history lists, but is strictly excluded from:
     - competitive completed-round counts;
     - average competitive accuracy;
     - leaderboard tie-breaks;
     - historical Category Mastery backfill and live calibration.
   - Updates occur within the atomic PostgreSQL session-completion transaction and record an immutable entry in `session_category_mastery_changes` keyed by unique `(sessionId, questionType)`.
   - Guest sessions claimed in `claimAllGuestSessions` are history only and never mutate Logic Rating or Category Mastery.

### Consequences
- Plausible, natural entry-level calibration: new players start with sensible expected performance rather than 1% accuracy assumptions.
- True cognitive depth: players receive personalized feedback and progression across each distinct reasoning discipline.
- Prevents leaderboard abuse and farming.
- Provides a rock-solid foundation for Category-Adaptive Difficulty (P1.10B) and Category Leaderboards (P1.10C).

---

## ADR-0004: Category-Adaptive Difficulty Pre-Generation Plan & Weekly Competitive Fairness

### Status
Accepted (Milestones P1.10B & P1.10D.1)

### Context
1. **Adaptive Difficulty (P1.10B)**:
   Personalized progression requires questions in competitive challenge sessions to scale dynamically with the player's demonstrated category mastery rather than using static difficulty distributions.
   However, competitive challenges must be completely deterministic, reproducible from seeds, and immune to intra-round tampering.
   Earlier speculative designs considered intra-round dynamic difficulty adjustment based on answer streaks. This was rejected because:
   - Intra-round adaptation breaks seed replayability: reproducing the session would require knowing the exact answer sequence rather than just the session seed.
   - It introduces cheating/exploiting surfaces where intentionally failing an early question lowers the difficulty of later high-value questions.
   - It complicates offline question generation and mobile synchronization.

2. **Weekly Performance Leaderboard Fairness (P1.10D.1)**:
   Ranking weekly performance by cumulative score (`SUM(total_score)`) rewarded play volume and grind over skill, rendering Quick (5 questions), Standard (10 questions), Long (15 questions), and Mode (10 questions) incomparable.
   Furthermore, an explicit allowlist was needed to strictly exclude Daily, Duel, Custom, claimed guest sessions, and suspicious sessions.

### Decision

1. **Pre-Round Category-Adaptive Difficulty Plan**:
   - Mastery/category ratings are read *before* the challenge round begins in `startChallengeSessionAtomic` / `buildChallengeQuestions`.
   - The effective skill rating for each category is resolved from qualified/provisional category mastery (or Logic Rating prior fallback).
   - The deterministic per-category difficulty distribution is computed and frozen into the question plan for the entire round.
   - **Contract Clarification**: Adaptive difficulty is snapshotted before question generation and remains strictly fixed for that session. **There is NO dynamic intra-round adaptation or streak-based question mutation during an active round.**

2. **Weekly Leaderboard Answer-Level Normalized Performance**:
   - Replaced raw cumulative score with answer-level normalized performance.
   - Eligible sessions use an explicit allowlist:
     - `quick`
     - `standard`
     - `long`
     - `mode`
   - Strictly excluded:
     - `daily`
     - `duel`
     - `custom`
     - claimed guest history (`claimed_at IS NOT NULL`)
     - suspicious sessions (`is_suspicious = true`)
     - non-completed sessions (`status != 'completed'`)
   - Exact qualification threshold: minimum 20 rated answers within the UTC ISO week window (Monday 00:00:00 UTC to next Monday 00:00:00 UTC).
   - Canonical 5-tier ranking order:
     1. `averageScorePerAnswer DESC = AVG(session_answers.score_earned)`
     2. `averageAccuracy DESC = AVG(is_correct)`
     3. `responseTimeRatio ASC = AVG(time_spent_seconds / time_limit_seconds)`
     4. `totalQuestions DESC = COUNT(session_answers.id)`
     5. `userId ASC`
   - Unified CTE window ordering: `row_number() OVER (...) as position` ensures paginated list positions and pinned-user positions are identical.

### Consequences
- Uncompromising competitive fairness: playing additional mediocre rounds cannot outrank a player with superior normalized cognitive performance.
- Full cross-format comparability: Quick, Standard, Long, and Mode are evaluated uniformly at the answer level.
- Clean architectural determinism: sessions remain 100% replayable from seed and challenge config.

