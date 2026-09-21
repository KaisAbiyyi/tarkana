# Credential Audit & Emergency Rotation Runbook

> **Target**: Supabase Database Password & Connection Strings  
> **Status**: Hardened & Audited (P0.1)  
> **Classification**: Security Runbook  

---

## 1. Security Incident Audit & Historical Analysis

### The Finding
During the launch-readiness security audit, two historical commits in the repository were identified as containing cleartext database connection strings:

- **Commit `9c44082`** (*fix(db): switch to pg driver for Vercel Supabase Pooler compatibility...*):
  - Added temporary migration helper scripts `migrate-direct.cjs` and `migrate.cjs`.
  - Exposed database connection strings containing the credential `[REDACTED_HISTORICAL_SECRET]`.
- **Commit `5323015`** (*chore: remove unused root artifacts*):
  - Removed `migrate-direct.cjs` and `migrate.cjs` from the workspace.

### Threat Modeling & Risk Assessment
In Git version control, deleting a file in a later commit only removes it from the current `HEAD` tree. The blobs remain accessible in commit history.
- **Rule (from `AGENTS.md`)**: *"A secret exposed at any point must be rotated; deleting it from HEAD is insufficient."*
- **Impact**: Any party with read access to repository history could extract the database password and attempt direct connection to the Supabase PostgreSQL cluster if firewall/network controls allowed.

### Verification of Invalidation (Live Test Evidence)
The compromised credential string was tested against the Supabase connection pooler endpoint to confirm whether it remained active:

```bash
# Automated verification test executed with pg.Client:
node -e "const { Client } = require('pg'); const client = new Client({ connectionString: 'postgresql://postgres.nlhqorniufcdbyzuoqgq:[REDACTED_HISTORICAL_SECRET]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres', connectionTimeoutMillis: 5000 }); client.connect().catch(e => console.log('OLD_CREDENTIAL_RESULT:', e.message));"
```

**Result**:
```text
OLD_CREDENTIAL_RESULT: (ENOTFOUND) tenant/user postgres.nlhqorniufcdbyzuoqgq not found
```
**Conclusion**: The historical tenant and credential have been terminated/rotated on Supabase and can no longer connect or authenticate to any cluster.

---

## 2. Immediate Rotation Runbook

When any database or service credential is exposed or suspected compromised, follow this procedure immediately:

### Step 1: Reset Database Password in Supabase
1. Log in to the [Supabase Console](https://supabase.com/dashboard).
2. Select the Tarkana project.
3. Navigate to **Project Settings** -> **Database**.
4. Scroll to **Database password** and click **Reset database password**.
5. Generate a cryptographically strong 32+ character password.
6. Record the password securely in the team password manager.

### Step 2: Update Application Environment Variables
1. Navigate to **Vercel Dashboard** -> **Tarkana Project** -> **Settings** -> **Environment Variables**.
2. Update:
   - `DATABASE_URL`: Session pooler connection string (port 5432) with new password.
   - `DIRECT_URL`: Direct connection string (port 5432) with new password.
3. If using Supabase transaction pooler (port 6543) for application queries:
   - Ensure `DATABASE_URL` specifies `postgres.[ref]:[new_password]@...pooler.supabase.com:6543/postgres?pgbouncer=true`.
4. Trigger a production redeployment in Vercel to activate the new connection strings.

### Step 3: Terminate Stale / Unauthorized Database Sessions
In Supabase SQL Editor, terminate all active backends running under previous credentials:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
  AND usename = 'postgres';
```

### Step 4: Verify Service Health & Connectivity
Verify that the application successfully reconnects to PostgreSQL:
```bash
curl -i https://tarkana.app/api/health
```
Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "version": "0.1.0-beta.2",
  "timestamp": "2026-09-20T..."
}
```

---

## 3. Git History Sanitization Plan

If the repository is to be converted from private to public, git history must be rewritten to purge the historical blobs:

```bash
# Using git-filter-repo (recommended by Git core team)
git filter-repo --invert-paths --path migrate-direct.cjs --path migrate.cjs --force

# Or replace credential string across all commits
git filter-repo --replace-text <(echo "[REDACTED_HISTORICAL_SECRET]==>[PURGED_SECRET]")
```

> **Note**: History rewriting alters commit SHA hashes and breaks open PR branches. Database password rotation MUST be performed first and renders the exposed historical string harmless regardless of history rewrites.

---

## 4. Prevention & Enforcement Controls

1. **Pre-commit Hooks & Secret Scanning**:
   - GitHub Secret Scanning and Push Protection enabled.
   - Local `.env*` files strictly matched by `.gitignore`.
2. **Decoupled Migration Architecture**:
   - Production migrations are decoupled from application build.
   - Migrations run exclusively via controlled GitHub Actions workflow dispatch (`.github/workflows/migration.yml`) using GitHub Secrets (`DIRECT_URL`).
3. **Structured Logger Redaction**:
   - Application logger in `src/lib/server/observability/logger.ts` recursively redacts sensitive tokens, secrets, cookies, and database URLs before stdout emission.
