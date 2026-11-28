# Tarkana Web-First Sequential Work Packages (Owner Decision 2026-11-28)

**Authority.** On 2026-11-28, the owner restructured active Tarkana execution into **Web-First Sequential Work Packages (`TARK-WEB-WP01`..`TARK-WEB-WP09`)** with **strictly serial execution (no parallel WPs)**. Live status remains in the Notion database *Tarkana · Execution Tasks*, backed by GitHub Issues under milestone [Web-First Sequential WPs](https://github.com/KaisAbiyyi/tarkana/milestone/1). Nothing in this document accepts a task, passes a gate, or grants merge authority.

## 1. Execution Rules

1. **Strictly serial (no parallel WPs):** Maximum **one** WP active in `02 · Now` and **one** direct successor in `03 · Up Next` at any time. `WP(N+1)` cannot be claimed until `WP(N)` reaches `Done` (CI green, independent review PASS, owner check OK where required, and merged to `main`).
2. **Web-first focus:** All active WPs target the SvelteKit web app, server/DB services, and production operations in `KaisAbiyyi/tarkana`.
3. **Android deferred, contracts protected:** `TARK-LR-02` (Web–Android compatibility audit), `TARK-LR-06` (Google Play internal release), and `TARK-G05` (Android streak parity) are deferred until the Web WP train finishes. Every API change during `WP01..WP09` must remain additive so existing Android clients are not broken.
4. **P1 Competitive stays frozen; P2 stays evidence-gated:** No new competitive milestones or P2 AI Coach work before real retention evidence (`WP09`).
5. **Governance unchanged:** Planner-class models write plans/WPs/ADRs; independent reviewer (Claude Sonnet 5.5, effort High) reviews read-only and holds standing merge authority for exact reviewed head SHA with green required checks; implementors never merge; no `Co-Authored-By` trailers.

## 2. Sequential Work Package Chain (`WP01` → `WP09`)

| Order | WP ID | GitHub Issue | Focus | Absorbs | Environment | Gate / Done When |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `TARK-WEB-WP01` | [#64](https://github.com/KaisAbiyyi/tarkana/issues/64) | Web CI unblock (Ubuntu 26.04 / Playwright) & parallel DB test isolation | Web CI blocker + `TARK-Q01` | Cloud-only | `Web CI` & `CodeQL` green on exact head, 5x parallel `npm run test:unit` PASS, merged |
| 2 | `TARK-WEB-WP02` | [#65](https://github.com/KaisAbiyyi/tarkana/issues/65) | Production backend recovery, live health & keepalive verification | `TARK-LR-01` | Cloud + Owner | Live Supabase/DB/migrations/Edge Functions verified, `/api/health` + live guest/login E2E PASS, keepalive resolved |
| 3 | `TARK-WEB-WP03` | [#66](https://github.com/KaisAbiyyi/tarkana/issues/66) | Web observability, endpoint telemetry & synthetic alerting | `TARK-LR-03` | Cloud-only | Uptime probes active, core endpoint latency/error telemetry with `x-request-id`, 1 synthetic alert proven, zero PII leaks |
| 4 | `TARK-WEB-WP04` | [#67](https://github.com/KaisAbiyyi/tarkana/issues/67) ([PR #62](https://github.com/KaisAbiyyi/tarkana/pull/62)) | Daily Streak backend finalization & live preview verification | `TARK-G01` | Cloud + Owner | PR #62 rebased on `WP01..WP03`, Web CI green, independent review PASS, live preview API check OK, merged |
| 5 | `TARK-WEB-WP05` | [#68](https://github.com/KaisAbiyyi/tarkana/issues/68) | Daily Streak Web UI | `TARK-G02` | Cloud + Owner | Header streak indicator, top dashboard Daily card/countdown, completion `+1`/milestone/freeze UI, 390px mobile + a11y + E2E, merged |
| 6 | `TARK-WEB-WP06` | [#69](https://github.com/KaisAbiyyi/tarkana/issues/69) | Daily share grid & daily percentile | `TARK-G03` | Cloud + Owner | Server-built spoiler-free grid + streak + daily percentile wired to OG share card, tests + owner check OK, merged |
| 7 | `TARK-WEB-WP07` | [#70](https://github.com/KaisAbiyyi/tarkana/issues/70) | Daily Challenge history calendar (Web) | `TARK-G04` | Cloud + Owner | Monthly calendar from completed daily dates with accuracy colors & freeze markers, mobile + tests + owner check OK, merged |
| 8 | `TARK-WEB-WP08` | [#71](https://github.com/KaisAbiyyi/tarkana/issues/71) | Web controlled internal beta | `TARK-LR-04` (web scope) | Cloud + Owner | Owner-approved web tester cohort completes core journeys, zero P0 defects open, release decision recorded |
| 9 | `TARK-WEB-WP09` | [#72](https://github.com/KaisAbiyyi/tarkana/issues/72) | Web activation & retention evidence (D1/D7) | `TARK-LR-05` | Cloud + Owner | Reproducible activation funnel & D1/D7 retention baseline report with honest sample-size disclosure |

## 3. Absorbed & Deferred Legacy Tasks

Claim the **Work Package (`TARK-WEB-WPxx`)**, not the legacy task cards below. Legacy cards remain in Notion for auditability with their factual history preserved:

- **Absorbed into Web WPs:** `TARK-Q01` → `WP01`; `TARK-LR-01` → `WP02`; `TARK-LR-03` → `WP03`; `TARK-G01` (PR #62) → `WP04`; `TARK-G02` → `WP05`; `TARK-G03` → `WP06`; `TARK-G04` → `WP07`; `TARK-LR-04` (web scope) → `WP08`; `TARK-LR-05` → `WP09`.
- **Deferred (Android / cross-platform after Web WP train):** `TARK-LR-02`, `TARK-LR-06`, `TARK-G05`.
- **Historical foundation (unchanged, `Done`):** `TARK-D01`, `TARK-D02`, `TARK-D03`, `TARK-D04`.
