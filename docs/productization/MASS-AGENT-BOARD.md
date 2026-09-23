# Mass Agent Coordination Board

Use this file or a GitHub Project as the live ownership board when multiple AI agents work simultaneously.

## Rule: Lock High-Conflict Areas

Before assigning an agent, mark ownership of any hotspot it will edit.

### Hotspots

| Hotspot | Examples | Parallel Ownership |
|---|---|---|
| Database schema/migrations | Drizzle schema, migrations, RLS | One agent at a time |
| Challenge DTO/contracts | shared API types, active question DTO | One agent at a time |
| Scoring/rating | scoring, rating, rank | One agent at a time |
| Auth/session | hooks, auth helpers, token/session handling | One agent at a time |
| Edge shared code | `supabase/functions/_shared/**` | One agent at a time unless files are disjoint and coordinated |
| Root package config | package scripts, lockfile, Vite/Playwright config | One agent at a time |
| Analytics event schema | canonical event names/properties | One owner, consumers may implement after contract freezes |
| Android API client/auth | API client, auth session | One agent at a time |

## Safe Parallel Lanes

A possible Phase 0–2 allocation:

| Lane | Mission | Dependency |
|---|---|---|
| A | Web CI | none |
| B | Android CI | none |
| C | README/repository metadata | none |
| D | Security history audit | none |
| E | RLS integration test design | schema owner coordination |
| F | Error tracking | Phase 0 config coordination |
| G | Product analytics contract | no implementation until schema frozen |
| H | Generator benchmark | challenge engine read-only unless bugs found |
| I | Performance harness | coordinate production safety |

Later Phase 3–4:

| Lane | Mission | Dependency |
|---|---|---|
| A | Guest session backend | owns guest data contract |
| B | Guest UI | waits for backend contract freeze |
| C | Daily Challenge backend | owns daily challenge contract |
| D | Daily UI | waits for backend contract freeze |
| E | Share/referral backend | owns share contract |
| F | Result card/OG UI | waits for share contract |
| G | Android deep links | waits for share URL contract |

## Task States

Use:

```text
READY
LOCKED
IN_PROGRESS
PR_OPEN
BLOCKED
MERGED
VERIFIED_PRODUCTION
```

Do not assign another agent to a `LOCKED` hotspot until the owner reaches `MERGED` or explicitly releases it.

## Agent Handoff

When an agent finishes a contract-producing task, publish a short handoff:

```text
Contract frozen at commit:
Types/endpoints:
Migration required:
Consumer notes:
Known limitations:
Safe for downstream agents: yes/no
```

## Merge Sequencing

If two PRs depend on each other:

1. Merge the contract/foundation PR first.
2. Rebase/update downstream branch.
3. Run full tests again.
4. Merge consumer PR.

Do not resolve semantic conflicts by mechanically accepting "ours" or "theirs".

## Suggested Owner Board

Copy and maintain:

| Area | Agent | Issue | Branch | State |
|---|---|---|---|---|
| Web CI | Antigravity | #20 | chore/phase-0-launch-readiness | MERGED |
| Android CI | Antigravity | #20 | chore/phase-0-launch-readiness | MERGED |
| Security/RLS | Antigravity | #21 | fix/security-and-rls-hardening | MERGED |
| Observability | Antigravity | #22 | feat/phase-0-observability | MERGED |
| Guest mode | Antigravity | #27 | feat/p1.1-guest-challenge-mode | MERGED |
| Daily Challenge | Antigravity | #30 | feat/p1.3-daily-challenge | MERGED |
| Share/referral | Antigravity | #33 | feat/p1.4-social-share-results | MERGED |
| Analytics | Antigravity | #36 | feat/p1.5-product-analytics | MERGED |
| Blind Duel (P1.6/P1.6.1) | Antigravity | #38 | feat/p1.6.1-blind-duel-hardening | MERGED |
| Android release (P1.7/P1.7.1) | Antigravity | #39 | feat/p1.7.1-release-hardening | MERGED |
| Generator benchmark (P1.8) | Antigravity | #41 | feat/p1.8-generator-benchmarks-and-diagnostics | PR_OPEN |
