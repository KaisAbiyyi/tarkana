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
