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
Accepted (Milestone P1.10A)

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

### Decision

1. **Question-Level Elo Calibration Model**:
   Category Mastery is updated at the individual question level using a difficulty-aware logistic expected-performance model.
   For question $i$ with difficulty rating $D_i$ and player category mastery $R$:
   $$\text{Expected Score } E_i = \frac{1}{1 + 10^{(D_i - R) / 400}}$$
   $$\text{Question Delta } \delta_i = K \times (S_i - E_i)$$
   where $S_i \in \{0, 1\}$ represents answer correctness, and $K$ is the sensitivity factor ($K_{\text{provisional}} = 16$, $K_{\text{established}} = 8$).

2. **Difficulty-to-Rating Mapping**:
   Each question's difficulty band maps to a canonical difficulty benchmark:
   - `easy`: $D_{\text{easy}} = 700 + \text{scoreOffset}$ (nominal 700, range 600–900)
   - `medium`: $D_{\text{medium}} = 1250 + \text{scoreOffset}$ (nominal 1250, range 1100–1450)
   - `hard`: $D_{\text{hard}} = 1850 + \text{scoreOffset}$ (nominal 1850, range 1700–2100)

3. **Mathematical Invariant Guarantees**:
   - **Monotonic Reward**: For identical mastery, $\delta_{\text{correct}}(D_{\text{hard}}) > \delta_{\text{correct}}(D_{\text{easy}})$. Harder questions always reward strictly more rating points.
   - **Asymptotic Farming Resistance**: As $R \gg D$, $E \to 1.0$, so $\delta_{\text{correct}} = K(1 - E) \to 0$. High-mastery players gain zero or negligible points from farming easy questions.
   - **Blunder Asymmetry**: For incorrect answers, $\delta_{\text{wrong}} = -K \times E$. Missing an unexpectedly easy question ($E \approx 1$) penalizes $-K$; missing a question far above one's mastery ($E \approx 0$) produces a negligible penalty.
   - **Strict Bounds**: Category mastery is deterministically bounded within $[0, 3000]$.

4. **Provisional Mastery & Priors**:
   - When a player first attempts a category, initial mastery initializes from the player's current global Logic Rating prior (or 0 if Unranked).
   - Category mastery remains **Provisional** until the player completes at least **20 rated questions** and **3 rated sessions** in that category.
   - Provisional mastery drives personal adaptive difficulty (P1.10B) but is excluded from public Category Leaderboards (P1.10C).

5. **Session Eligibility & Historical Integrity**:
   - Category mastery mutations are strictly restricted to authenticated, non-suspicious, competitive sessions (`isMasteryEligibleChallengeType`: `quick`, `standard`, `long`, `mode`).
   - Daily Challenges, Duels, Custom sessions, and claimed guest history award strictly **`+0`** category mastery.
   - Updates occur within the atomic PostgreSQL session-completion transaction and record an immutable entry in `session_category_mastery_changes` keyed by unique `(sessionId, questionType)`.
   - Guest sessions claimed in `claimAllGuestSessions` are history only and never mutate Logic Rating or Category Mastery.

### Consequences
- True cognitive depth: players receive personalized feedback and progression across each distinct reasoning discipline.
- Prevents leaderboard abuse and farming.
- Provides a solid foundation for Category-Adaptive Difficulty (P1.10B) and Category Leaderboards (P1.10C).
