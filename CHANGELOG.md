# Changelog

All notable changes to Tarkana are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- P0: Web CI and Android CI workflows with automated linting, tests, and build gates.
- P0: Automated GitHub CodeQL static analysis scanning.
- P0: Automated Dependabot configuration for npm and GitHub Actions.
- P0: Structured request logging with correlation ID (x-request-id) tracking.
- P0: Dedicated /api/health uptime and database connectivity probe.
- P0: Sliding window rate limiting on abuse-sensitive challenge endpoints.
- P0: Idempotent session replay handling and challenge completion verification tests.
- P0: Standard repository governance: SECURITY.md, CONTRIBUTING.md, .env.example, and MIT LICENSE.

### Changed

- Decoupled database migration execution from application build (
  pm run build now runs ite build cleanly). Added explicit
  pm run db:migrate:prod.
- Standardized package management on
  pm and removed duplicate un.lock.
- Removed duplicate Copilot instruction files.

## [0.1.0-beta.2] - 2026-06-20

- Ranked logic challenge engine with multi-mode puzzles (Number Sequence, Symbol Pattern, Mini Deduction, Memory Pattern).
- SvelteKit web client and Java Android player application.
- Supabase auth integration with Google provider.
- Drizzle ORM schema and migrations.
