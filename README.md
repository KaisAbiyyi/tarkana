# Tarkana

<div align="center">

<table>
  <tr>
    <td align="center" bgcolor="#ffd21e">
      <strong>Ranked logic challenges with a loud, sharp, neobrutalist interface.</strong>
    </td>
  </tr>
</table>

<br>

<a href="https://github.com/KaisAbiyyi/tarkana/stargazers"><img alt="Star Tarkana Web" src="https://img.shields.io/badge/STAR%20THE%20WEB%20APP-FFD21E?style=for-the-badge&labelColor=17120D&color=FFD21E"></a>
<a href="https://github.com/KaisAbiyyi/tarkana-android"><img alt="Open Tarkana Android" src="https://img.shields.io/badge/OPEN%20MOBILE%20REPO-16CBB2?style=for-the-badge&labelColor=17120D&color=16CBB2"></a>
<a href="https://github.com/KaisAbiyyi/tarkana-android/stargazers"><img alt="Star Tarkana Android" src="https://img.shields.io/badge/STAR%20THE%20MOBILE%20APP-FF5C5C?style=for-the-badge&labelColor=17120D&color=FF5C5C"></a>

</div>

## What Is This?

Tarkana is a timed logic challenge platform with ranked sessions, category mastery, leaderboards, history tracking, and reviewable results. This repository owns the web application, database-facing contracts, challenge generation, scoring rules, and Supabase Edge Functions.

The native Android client lives here:

https://github.com/KaisAbiyyi/tarkana-android

## Beta Release

Current beta version:

```text
0.1.0-beta.1
```

Release channels:

- Web release: https://github.com/KaisAbiyyi/tarkana/releases
- Android APK release: https://github.com/KaisAbiyyi/tarkana-android/releases

## Tech Stack

- SvelteKit
- TypeScript
- Tailwind CSS
- GSAP
- Vitest
- Playwright
- Drizzle ORM
- PostgreSQL
- Supabase Auth
- Supabase Edge Functions

## Project Shape

```text
src/
  lib/
    components/       UI components for public pages, app shell, dashboard, arena, and results
    server/           Server-side services, auth helpers, challenge generation, and sessions
    shared/           Shared constants, presentation helpers, and typed contracts
  routes/             SvelteKit pages and route handlers

supabase/
  functions/          Edge Functions consumed by web and Android clients
  seed.sql            Local seed data

scripts/              Build and maintenance scripts
```

## Local Setup

Install dependencies:

```sh
npm install
```

Create your local environment file according to the variables used by the SvelteKit and Supabase integration.

Run the web app:

```sh
npm run dev
```

Run checks:

```sh
npm run check
npm run test:unit -- --run
```

Build for production:

```sh
npm run build
```

## Supabase Functions

The Android app calls the deployed Edge Functions from this repository. When changing gameplay DTOs, scoring, active session recovery, or challenge generation, deploy the affected functions after merging.

Common gameplay functions:

```text
start-challenge
submit-answer
get-active-challenge
finish-challenge
abandon-challenge
```

## Related Repositories

<table>
  <tr>
    <th>Repository</th>
    <th>Role</th>
    <th>Action</th>
  </tr>
  <tr>
    <td><a href="https://github.com/KaisAbiyyi/tarkana">tarkana</a></td>
    <td>Web app, backend contract, Edge Functions</td>
    <td><a href="https://github.com/KaisAbiyyi/tarkana/stargazers">Star the web app</a></td>
  </tr>
  <tr>
    <td><a href="https://github.com/KaisAbiyyi/tarkana-android">tarkana-android</a></td>
    <td>Native Android client</td>
    <td><a href="https://github.com/KaisAbiyyi/tarkana-android/stargazers">Star the mobile app</a></td>
  </tr>
</table>

## Release Notes Style

Use semantic prerelease tags while the product is still in beta:

```text
v0.1.0-beta.1              Web release
android-v0.1.0-beta.1      Android APK release
```

Keep the web and Android beta numbers aligned when the release represents the same product milestone.
