# Tarkana Branch Protection & Ruleset Policy

> Canonical branch protection rules and GitHub Ruleset configuration for Tarkana repositories.

## 1. Target Branch: `main`

Direct pushes to `main` are strictly prohibited for all contributors and automated agents. All changes must arrive via pull request with verified validation evidence.

## 2. GitHub Ruleset Configuration

### Target Enforcement
- **Rule Type**: Branch Ruleset
- **Enforcement Status**: Active
- **Target Branches**: `refs/heads/main`
- **Bypass List**: Repository Admin (Emergency break-glass only, requiring post-incident review)

### Restrictions
- **Restrict deletions**: Enabled (prevents accidental branch deletion)
- **Block force pushes**: Enabled (prevents history rewrite or divergent commits)
- **Require linear history**: Enabled (enforces rebase or squash-and-merge)

### Pull Request Requirements
- **Require pull request before merging**: Enabled
- **Required approvals**: 1 approval
- **Dismiss stale pull request approvals when new commits are pushed**: Enabled
- **Require conversation resolution before merging**: Enabled

### Required Status Checks
All required checks must pass prior to merge:
1. **Web CI / Verify (`Lint, Typecheck, Test & Build & Playwright E2E`)**
   - SvelteKit typecheck (`npm run check`)
   - Prettier & ESLint check (`npm run lint`)
   - Vitest Unit Test Suite (`npm run test:unit`)
   - Production build (`npm run build`)
   - Playwright Critical-Path E2E (`npm run test:e2e`)
2. **CodeQL / Analyze (`security-extended`)**
   - Static application security testing for JavaScript/TypeScript
3. **Android CI / Assemble & Test**
   - Native Android unit tests and release artifact assembly (`assembleRelease`, `testReleaseUnitTest`)

---

## 3. Automation Setup (GitHub CLI)

To apply or verify these branch rules via GitHub CLI:

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/:owner/:repo/branches/main/protection \
  -f required_status_checks='{"strict":true,"contexts":["verify","analyze","Android CI"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  -f restrictions=null
```
