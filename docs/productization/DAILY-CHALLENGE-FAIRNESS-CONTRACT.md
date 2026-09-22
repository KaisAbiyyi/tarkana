# Tarkana Daily Challenge Fairness & Determinism Contract

> **Scope**: Applies to Daily Challenge generation, snapshot persistence, attempt accounting, internationalization, and future leaderboards (Milestones P1.3 and P1.4).

---

## 1. Core Principles

The Daily Challenge is a globally synchronized, competitive logic event designed to measure cognitive speed and reasoning accuracy under uniform conditions. To guarantee competitive integrity across all players worldwide, Tarkana enforces the following six fairness invariants:

---

## 2. Invariants

### 2.1 Global Determinism
- **HMAC-SHA256 Seed**: Every daily challenge seed is computed server-side using HMAC-SHA256:
  ```text
  seed = HMAC-SHA256(DAILY_CHALLENGE_SECRET, "tarkana:daily:YYYY-MM-DD:cfg{configVersion}:gen{generatorVersion}")
  ```
- **Independent of User Context**: The seed, puzzle generation, and question sequence are completely independent of player rating, rank, device, browser, or locale.
- **Unguessability**: The master HMAC seed is never transmitted to the client. Question instances receive opaque public seeds formatted as `daily:{dateString}:{orderIndex}`.

### 2.2 Canonical English Snapshot Invariance
- **Single Source of Truth**: When the first player requests the daily challenge for date `YYYY-MM-DD`, the server computes the 10 questions and commits an immutable snapshot into `daily_challenges.puzzle_snapshot`.
- **Snapshot Immutability**: The canonical snapshot is persisted with English prompts, choices, and explanations.
- **Client Translation Safety**: Any client-side localization (e.g. Indonesian or Spanish) must never alter:
  - The logical premise or mathematical equation
  - The number or order of choices
  - The correct answer index or value
  - The difficulty rating or time limit
- Every player globally solves logically identical puzzle instances.

### 2.3 UTC Midnight Boundary
- **Universal Reset**: The daily challenge resets synchronously worldwide at `00:00:00 UTC`.
- **Zero Timezone Advantage**: No user can access a daily challenge earlier or later based on local system clock manipulation or geographical timezone.
- **Countdown Calibration**: Clients receive `secondsUntilReset` computed from `00:00:00 UTC` of the subsequent calendar day.

### 2.4 Single Official Attempt Rule
- **One Official Attempt Per Day**: Each registered user or guest device is granted strictly **one official attempt** per calendar date.
- **Resumption**: If a player leaves an in-progress challenge, reopening `/daily` resumes their canonical attempt without consuming a new attempt or resetting the timer.
- **Forfeiture on Abandonment**: If an in-progress session is explicitly abandoned via `/api/challenge/abandon`, the attempt status is marked `abandoned` and permanently forfeited. Any subsequent start request for that date is rejected with HTTP `409 Conflict`.
- **Atomic Concurrency Guarantee**: Concurrent start requests from multiple tabs or devices are serialized via PostgreSQL database transactions. Concurrent requests resolve to the same canonical session with zero orphan records.

### 2.5 Competitive Rating Isolation
- **0 Logic Rating Delta**: Completing a Daily Challenge awards strictly `+0` delta to the player's competitive Logic Rating.
- **Integrity**: Rating manipulation, bot farming, or rating inflation cannot occur via Daily Challenges.
- **Guest Claim Safety**: If a guest completes a daily challenge and subsequently logs into an account that already completed an attempt on the same day, the guest attempt is converted with `is_official = false` to preserve the single official attempt rule.

### 2.6 Server-Authoritative Scoring (Leaderboard Readiness)
- **Anti-Cheat & Timing**: Score, accuracy, and elapsed time are calculated and validated entirely server-side.
- **P1.4 Compatibility**: The `daily_challenge_attempts` table records canonical `score`, `accuracy`, and `totalTimeSeconds`, providing the immutable foundation for deterministic daily leaderboards.
