# Workstream 01 Database Compatibility Notes

The web repo now defines the shared MVP database contract through Drizzle schema.

## Shared Tables

- `users_profile`
- `categories`
- `question_rules`
- `challenge_configs`
- `challenge_sessions`
- `session_questions`
- `session_answers`

## Compatibility Guidance

- Android is not implemented in this repository.
- Future Android clients may read the same Supabase tables, so table and column renames should be avoided after migrations are applied.
- Prefer additive migrations for new challenge modes, rule metadata, and leaderboard fields.
- `session_questions.correct_answer` is persisted for server-side validation and result review, but active-question API responses must strip it before browser or Android clients receive a question.
- Leaderboard responses must use `display_name`, never email.
- Suspicious sessions must remain excluded from leaderboard aggregation.

