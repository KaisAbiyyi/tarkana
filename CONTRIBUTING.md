# Contributing to Tarkana

Welcome to the Tarkana codebase. Before submitting pull requests, please read through these contribution rules to ensure consistency, quality, and security.

## Code of Conduct & Principles

- **Focus on Verified Value**: Do not submit code solely for cosmetic refactors or résumé keyword matching.
- **Maintain Contracts**: Ensure backward compatibility across Web and Android API clients.
- **AI Agent Guidelines**: If you use AI assistants, inspect and verify all code before submitting. Every non-trivial change must include unit/integration tests and static validation evidence.

## Branch Naming & Git Workflow

- Feature branches must branch off main and be kept up to date.
- Recommended branch prefixes:
  - eat/: New user or system feature
  - ix/: Bug fixes
  - perf/: Measurable performance improvements
  - security/: Vulnerability fixes or hardening
  - chore/: Tooling, CI, and dependency maintenance
  - docs/: Documentation updates
  -     est/: Test additions or test infrastructure improvements
- Do not commit directly to main. Always open a Pull Request.

## Quality Gates Checklist

Before opening a PR, ensure all checks pass locally:

`ash

# Typecheck

npm run check

# Formatting and linting

npm run lint

# Unit tests

npm run test:unit -- --run

# Production build

npm run build
`

## Pull Request Guidelines

- Provide a clear description of the problem, the behavioral contract changed, and the validation results.
- Keep PRs focused on a single outcome. Avoid giant PRs containing mixed concerns.
