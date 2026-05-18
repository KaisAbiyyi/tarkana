# Foundation Requirements and Constraints

## Functional Requirements

Auth:

- Users can register with email and password through Supabase Auth.
- Users can log in with email and password.
- Users can log in with Google OAuth through Supabase Auth.
- Users can log out.
- Auth session refresh is handled by SvelteKit server hooks.
- Profile is created after first successful login if it does not exist.

Authorization:

- Dashboard, challenge, result, history, leaderboard, and profile require authenticated session unless explicitly public.
- Admin pages and admin APIs require authenticated session plus profile role `admin`.
- User role defaults to `user`.
- Role must be read from server-trusted profile data, not client input.

Data:

- Implement tables from PRD: `users_profile`, `categories`, `question_rules`, `challenge_configs`, `challenge_sessions`, `session_questions`, `session_answers`.
- Add enum or constrained values for role, question type, challenge type, session status, rank, and difficulty band.
- Add timestamps and update timestamps where records are mutable.
- Store generated seed for each session question.
- Store correct answer only in server-readable session question records.
- Store suspicious session status and exclude it from leaderboard queries.

Services:

- Dashboard service returns default values when user has no completed challenge.
- History service returns only the authenticated user's sessions.
- Leaderboard service returns display name, rank, rating, average accuracy, and total completed challenges.
- Profile service allows changing display name but not rating, rank, role, or email.
- Admin service manages categories, question rules, challenge configs, mode availability, and session monitoring.

## Security Requirements

- Use Supabase Auth for identity.
- Use server-side session validation in hooks and page/server loads.
- Use Row Level Security for user-owned data.
- Use server-side role checks for admin.
- Do not expose emails in leaderboard.
- Do not expose Supabase service role key to browser.
- Do not expose `DATABASE_URL` to browser.
- Do not import server-only modules into `.svelte` files.
- Reject all mutations without authenticated session.
- Reject user id mismatches.
- Reject invalid UUID, enum, JSON config, and pagination input.
- Use safe error messages for the browser.

## Supabase RLS Constraints

RLS policies must allow:

- A user to read and update limited fields on their own profile.
- A user to read their own sessions, questions, and answers.
- A user to insert answers only through server-controlled flow if direct client writes are enabled.
- Public/authenticated read access to sanitized leaderboard source only if exposed through views that omit email.
- Admin users to manage categories, question rules, challenge configs, and monitoring data.

Preferred architecture:

- Browser calls SvelteKit server routes/actions.
- SvelteKit server validates session and performs DB writes.
- Direct client-side writes to sensitive challenge tables are avoided.

## Database Compatibility Constraints

Because Android may share Supabase:

- Avoid renaming stable columns without migration notes.
- Avoid removing columns that another client may read.
- Prefer additive migrations during MVP.
- Document enum additions.
- Keep challenge result and leaderboard response shapes explicit.

## Performance Constraints

- Dashboard data should be fetchable within 3 seconds on normal connection.
- Leaderboard query must use indexes on rating and completed session aggregates.
- History must paginate.
- Admin tables must paginate and filter server-side.
- Avoid N+1 query patterns in dashboard and result services.

## Reliability Constraints

- Session completion must be atomic from the user's perspective.
- Finished sessions must have complete score, accuracy, rating before/after, rank before/after, and answers.
- Repeated finish calls for a completed session must return the existing result.
- Database writes that update rating and session completion must be transaction-safe.

## Out of Scope

- Android API client.
- Android auth implementation.
- Offline-first sync.
- Payment.
- Multiplayer.
- Advanced anti-cheat beyond MVP suspicious flags.

