-- Idempotent MVP seed data for a fresh Tarkana database.

insert into public.categories (id, name, slug, description, is_active)
values
	('10000000-0000-4000-8000-000000000001', 'Number Sequence', 'number-sequence', 'Number pattern challenges.', true),
	('10000000-0000-4000-8000-000000000002', 'Symbol Pattern', 'symbol-pattern', 'Visual symbol pattern challenges.', true),
	('10000000-0000-4000-8000-000000000003', 'Mini Deduction', 'mini-deduction', 'Short deduction challenges.', true),
	('10000000-0000-4000-8000-000000000004', 'Memory Pattern', 'memory-pattern', 'Short memory pattern challenges.', true)
on conflict (slug) do update
set
	name = excluded.name,
	description = excluded.description,
	is_active = excluded.is_active,
	updated_at = now();

insert into public.question_rules (
	id,
	category_id,
	rule_type,
	difficulty_min,
	difficulty_max,
	difficulty_band,
	time_limit_seconds,
	config,
	is_active
)
values
	('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'arithmetic_sequence', 100, 520, null, 30, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'symbol_rotation', 100, 520, null, 25, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'comparison_chain', 100, 520, null, 35, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'symbol_recall', 100, 520, null, 30, '{}'::jsonb, true)
on conflict (id) do update
set
	category_id = excluded.category_id,
	rule_type = excluded.rule_type,
	difficulty_min = excluded.difficulty_min,
	difficulty_max = excluded.difficulty_max,
	difficulty_band = excluded.difficulty_band,
	time_limit_seconds = excluded.time_limit_seconds,
	config = excluded.config,
	is_active = excluded.is_active,
	updated_at = now();

insert into public.challenge_configs (
	id,
	name,
	challenge_type,
	question_count,
	mode_distribution,
	difficulty_distribution,
	is_active
)
values
	('30000000-0000-4000-8000-000000000001', 'Quick Challenge', 'quick', 5, null, null, true),
	('30000000-0000-4000-8000-000000000002', 'Standard Challenge', 'standard', 10, null, null, true),
	('30000000-0000-4000-8000-000000000003', 'Long Challenge', 'long', 20, null, null, true),
	('30000000-0000-4000-8000-000000000004', 'Mixed Challenge', 'mixed', 10, null, null, true),
	('30000000-0000-4000-8000-000000000005', 'Mode Challenge', 'mode', 10, null, null, true)
on conflict (id) do update
set
	name = excluded.name,
	challenge_type = excluded.challenge_type,
	question_count = excluded.question_count,
	mode_distribution = excluded.mode_distribution,
	difficulty_distribution = excluded.difficulty_distribution,
	is_active = excluded.is_active,
	updated_at = now();
