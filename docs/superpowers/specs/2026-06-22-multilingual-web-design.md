# Multilingual Web Design

## Scope

Add complete localization to the Tarkana SvelteKit web application. English is the default. Supported locales are English, Indonesian, Spanish, French, German, Portuguese, Simplified Chinese, Japanese, Korean, Arabic, Hindi, and Russian. Android remains out of scope.

System-owned text includes visible copy, metadata, accessibility labels, placeholders, validation and action feedback, safe page errors, admin UI, generated challenge prompts and explanations, rank/category/challenge labels, and date/number formatting. User- and admin-authored content remains in the language in which it was entered.

## Architecture

- Use a small typed localization layer under `src/lib/i18n` with English as the canonical key set and compile-time-complete dictionaries for every locale.
- Resolve locale from a validated cookie in the server hook, falling back to English. Expose locale through root layout data and Svelte context.
- Change locale through a server endpoint that validates the requested locale, writes a non-sensitive SameSite cookie, and redirects to a same-origin path.
- Set document `lang` and `dir`; Arabic uses RTL while every other supported locale uses LTR.
- Use native `Intl.DateTimeFormat`, `Intl.NumberFormat`, and `Intl.PluralRules`; add no dependency.
- Keep challenge answer validation canonical. Localize presentation strings from stable rule metadata so changing language does not change correctness or expose answers.
- Preserve English fallback for old stored sessions whose metadata cannot reconstruct localized presentation.

## UI

Add an accessible native language selector to public, authenticated, and admin shells. It uses native language names, submits without JavaScript as a baseline, and preserves the current route. Existing neo-brutalist styling and responsive navigation remain intact.

## Completeness Guard

- Every locale must satisfy the exact English dictionary type.
- Unit tests cover locale validation, fallback, interpolation, formatting, and RTL.
- A source audit rejects new untranslated user-facing literals in production Svelte and server boundary files, with explicit allowlists only for brand names, canonical identifiers, symbols, and user-authored content.
- Existing component and route tests are updated to assert English defaults and Indonesian switching.

## Verification

Run type checking, lint, unit tests, Playwright, and production build. Browser verification covers desktop and mobile layouts in English and Indonesian plus an Arabic RTL pass, including public, auth, app, challenge, result, history, leaderboard, profile, and admin states available locally.

## Deliberate Limits

No URL locale prefixes, translation service, database schema migration, or automatic translation of user/admin-authored content. These are unnecessary for the requested product behavior and can be added only if SEO-localized URLs or content translation becomes a real requirement.
