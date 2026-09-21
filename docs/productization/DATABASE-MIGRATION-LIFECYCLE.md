# Database Migration Lifecycle & Operational Runbook

> **Target**: PostgreSQL / Supabase Migration Pipeline  
> **Schema Authority**: Drizzle ORM (`src/lib/server/db/schema.ts`)  
> **Hard Rule**: Never make production migration execution dependent on an opaque application-build side effect.

---

## 1. Migration Philosophy & Rules

1. **Decoupled from Application Build**:
   - `npm run build` MUST NEVER execute database migrations.
   - Build-time migration side effects lead to failed deployments, lock contention on connection poolers, and catastrophic rollback scenarios.
2. **Deterministic Schema Changes**:
   - Drizzle schema is the sole source of truth.
   - Every schema modification generates a versioned SQL migration file in `drizzle/` with snapshot tracking in `drizzle/meta/`.
3. **Cross-Platform Compatibility**:
   - Schema alterations must maintain backwards compatibility with the native Android client (`tarkana-android`).
   - Breaking field changes require phased rollout: expand -> migrate -> contract.
4. **Concurrency Safety via Advisory Locks**:
   - Migrations acquire a cluster-wide PostgreSQL advisory lock (`pg_advisory_lock`) to serialize executions and prevent race conditions between simultaneous deployment pipelines.

---

## 2. The Expand-Contract (Two-Phase) Migration Strategy

To achieve zero-downtime releases and maintain compatibility between running web clients, background workers, and mobile apps (`tarkana-android`), all breaking schema transformations must follow the **Expand-Contract Pattern**:

```text
Phase 1: EXPAND (Deploy Migration)
  ├── Add new nullable columns or tables with default values.
  ├── Existing code continues reading/writing old columns.
  └── Android client continues operating uninterrupted.

Phase 2: DUAL-WRITE & TRANSITION (Deploy Application)
  ├── Application code writes to both old and new columns.
  ├── Application reads from new columns with fallback to old.
  └── Background backfill script copies legacy rows to new format.

Phase 3: CONTRACT (Deploy Clean-up Migration)
  ├── Apply NOT NULL constraints, unique indexes, or foreign keys to new columns.
  ├── Remove dual-writing and legacy fallbacks in application code.
  └── Drop old deprecated columns or legacy tables.
```

### Critical Rules for Zero-Downtime Changes:
- **Adding Columns**: Always add as `NULL` or with a database `DEFAULT`. Never add a `NOT NULL` column without a default to an existing table with rows.
- **Renaming Columns**: Never rename a column directly with `ALTER TABLE RENAME COLUMN`. Instead, add the new column (Expand), dual-write, backfill, and drop the old column (Contract).
- **Dropping Columns**: Deprecate in application code first; deploy code that no longer references the column; verify logs/metrics; then drop in a follow-up migration.

---

## 3. Local & Development Workflow

### Step 1: Modify Schema
Edit table definitions in `src/lib/server/db/schema.ts`.

### Step 2: Generate Migration SQL
Run:
```bash
npm run db:generate
```
This generates a new timestamped `.sql` file in `drizzle/` and records the migration snapshot in `drizzle/meta/_journal.json`.

### Step 3: Apply Migrations Locally
Apply against your local PostgreSQL instance:
```bash
npm run db:migrate
```

---

## 4. Production Migration Lifecycle & Concurrency Protection

### Step 1: Pre-Migration Validation
Inspect the generated SQL for non-destructive operations according to the Expand-Contract rules above.

### Step 2: Connection & Pooler Handling
Supabase provides two distinct connection mechanisms:
- **Transaction Pooler (Port 6543)**: Intended for fast serverless queries. **DDL statements (ALTER TABLE, CREATE TABLE) fail on port 6543** due to transaction-level pooling.
- **Session Pooler / Direct Connection (Port 5432)**: Required for executing DDL migrations.

Our production migration script (`scripts/migrate-production.mjs`) automatically detects and handles this:
- If a pooler connection URL on port `6543` is supplied, it automatically swaps the port to `5432` for migration execution.
- It validates the username structure (`postgres.<project-ref>`) required by Supabase poolers.

### Step 3: Cluster-Wide Concurrency Lock (`pg_advisory_lock`)
To ensure that multiple parallel CI workers or deployment triggers cannot execute migrations simultaneously:
1. `scripts/migrate-production.mjs` executes:
   ```sql
   SELECT pg_advisory_lock(hashtext('tarkana_production_migrations'));
   ```
2. Migrations run inside the acquired lock.
3. The advisory lock is unconditionally released in a `finally` block:
   ```sql
   SELECT pg_advisory_unlock(hashtext('tarkana_production_migrations'));
   ```

### Step 4: Execution via GitHub Actions (Controlled Dispatch)
Migrations in staging and production are triggered explicitly via GitHub Actions:
- Workflow: `.github/workflows/migration.yml`
- Trigger: `workflow_dispatch` (Manual approval / controlled release)
- Environment Secrets:
  - `DIRECT_URL`: Direct PostgreSQL connection string to port 5432.
  - `PUBLIC_SUPABASE_URL`: Supabase project reference URL.
  - `RUN_PRODUCTION_MIGRATIONS`: `true`

Command executed by CI:
```bash
node scripts/migrate-production.mjs
```

---

## 5. Rollback & Recovery Procedures

If a migration encounters an error during execution:
1. The script immediately aborts and releases the advisory lock.
2. Review the error details logged by `scripts/migrate-production.mjs`.
3. Revert unapplied entries in `drizzle/meta/_journal.json` if necessary.
4. If a partial DDL occurred prior to a failure, apply the compensatory rollback script manually via Supabase SQL Editor before re-triggering the workflow.
