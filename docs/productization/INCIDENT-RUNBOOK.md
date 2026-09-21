# Tarkana Incident Runbook

## Overview

This runbook outlines operational procedures and recovery steps for common production incidents affecting the Tarkana Web and Android platforms.

---

## 1. Severity Levels & Escalation

| Severity | Definition | Target Response | Notification Channel |
|---|---|---|---|
| **SEV-1** | Core challenge flow broken (cannot start, submit, or finish), auth down, data corruption. | < 15 minutes | Lead Engineer, Security Team |
| **SEV-2** | Non-critical feature down (leaderboard, history view, avatar upload), intermittent timeouts. | < 1 hour | On-call Engineer |
| **SEV-3** | Minor visual glitch, isolated client-side errors, non-blocking bug. | Next business day | Engineering backlog |

---

## 2. Health Monitoring & Triage

### Health Endpoint
- **URL**: `GET /api/health`
- **Expected Status**: `200 OK`
- **Response Format**:
  ```json
  {
    "status": "ok",
    "database": "reachable",
    "version": "0.1.0-beta.2",
    "timestamp": "2026-09-20T12:00:00.000Z"
  }
  ```
- **If 503 is returned**: The backend server is running but cannot query PostgreSQL (`SELECT 1` timed out or failed). The response will be `{"status":"degraded","database":"unreachable","version":"0.1.0-beta.2","timestamp":"..."}` without internal connection strings or error trace leak.

---

## 3. Common Failure Scenarios & Mitigation

### Scenario A: Database Connection Pool Exhaustion
- **Symptoms**: High request latency, `/api/health` returns 503, API endpoints return 500.
- **Root Causes**:
  - Connection pooler port mismatch (using transaction pooler 6543 for long connections or DDL).
  - Unclosed connection leaks.
- **Actions**:
  1. Inspect active connections in Supabase Dashboard (`Reports -> Database`).
  2. Confirm `DATABASE_URL` uses session pooler on port `5432` or transaction pooler with `?pgbouncer=true` on `6543`.
  3. Restart server instances or kill idle connections via Supabase SQL Editor:
     ```sql
     SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE state = 'idle' AND state_change < current_timestamp - INTERVAL '5 minutes';
     ```

### Scenario B: Leaked Credential Emergency Rotation
- **Symptoms**: Credential found in public repo, logs, or third-party leak.
- **Actions**:
  1. **Supabase Database Password**:
     - Go to `Supabase Dashboard -> Project Settings -> Database -> Database password`.
     - Click **Reset database password**.
     - Update environment variables in Vercel (`DATABASE_URL`, `DIRECT_URL`).
     - Trigger a new deployment.
  2. **Supabase Publishable / Service Keys**:
     - Rotate keys in `Project Settings -> API`.
     - Update `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Web and `local.properties` in Android.

### Scenario C: Rate Limiting Storm / False Positives
- **Symptoms**: Legitimate users receiving HTTP `429 Too Many Requests`.
- **Root Causes**:
  - Multiple users sharing a single NAT/corporate IP.
  - Aggressive pollers or stale client loops.
- **Actions**:
  1. Check structured logs for `x-request-id` and client IPs triggering rate limits.
  2. Adjust rate limit thresholds in `src/lib/server/security/rate-limit.ts` if user volume has scaled legitimately.

### Scenario D: Failed Database Migration
- **Symptoms**: Application build fails or database tables are out of sync with Drizzle schema.
- **Actions**:
  1. Note: Production migrations are decoupled from application build (`npm run build` does not run migrations).
  2. Inspect migration error logs using:
     ```bash
     npm run db:migrate:prod
     ```
  3. If a migration partially failed, review `drizzle/meta/_journal.json` and fix migration SQL before re-running.
