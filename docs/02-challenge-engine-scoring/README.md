# Workstream 2: Challenge Engine, Scoring, and Ranking

> **Required reading:** `docs/prd.md`, `docs/implementation-master-plan.md`, `docs/quality-security-standards.md`, then this folder.

## Mission

Build the core logic engine for Tarkana: procedural generation, rule validation, challenge assembly, server-side answer validation, scoring, rating, rank progression, and suspicious session detection.

## Ownership

This workstream owns:

- Number sequence generator.
- Symbol pattern generator.
- Mini deduction generator.
- Memory pattern generator.
- Choice and distractor generation.
- Rule validation.
- Difficulty resolution.
- ChallengeBuilder.
- Score formulas.
- Rating update and rank resolution.
- Suspicious session detection.
- Active question DTO that hides correct answer.
- Unit tests for formulas and generators.

This workstream does not own:

- Supabase auth setup.
- RLS policies.
- Web visual design.
- Admin page layout.
- Android implementation.

## Success Criteria

- Every generated question has exactly one correct answer.
- Every generated question includes explanation, difficulty score, time limit, metadata, and generated seed.
- ChallengeBuilder can create flexible question counts from config.
- Mixed challenge distribution uses active modes, difficulty, rule availability, user rating, and admin config.
- Correct answer is never sent to client before submit.
- Score and rating are computed on the server only.
- Tests cover each scoring and rank boundary.
- Tests cover deterministic seed reconstruction.

## Documents in This Folder

- `requirements-and-constraints.md`: algorithm, scoring, confidentiality, and reliability requirements.
- `implementation-plan.md`: detailed implementation sequence and target files.
- `task-checklist.md`: trackable task list for workers.

