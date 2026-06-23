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
	-- NUMBER SEQUENCE (6)
	('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'arithmetic_sequence', 100, 520, null, 30, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'geometric_sequence', 100, 520, null, 30, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'square_number', 100, 520, null, 30, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'fibonacci_like', 100, 520, null, 35, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'alternating_sequence', 100, 520, null, 35, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'increasing_difference', 100, 520, null, 35, '{}'::jsonb, true),

	-- SYMBOL PATTERN (6)
	('20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000002', 'symbol_rotation', 100, 520, null, 25, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000002', 'alternating_symbol', 100, 520, null, 25, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000002', 'repeating_cycle', 100, 520, null, 25, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000002', 'shape_order', 100, 520, null, 30, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000002', 'growing_count', 100, 520, null, 30, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000106', '10000000-0000-4000-8000-000000000002', 'mirrored_sequence', 100, 520, null, 30, '{}'::jsonb, true),

	-- MINI DEDUCTION (5)
	('20000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000003', 'comparison_chain', 100, 520, null, 35, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000202', '10000000-0000-4000-8000-000000000003', 'object_ordering', 100, 520, null, 35, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000203', '10000000-0000-4000-8000-000000000003', 'simple_elimination', 100, 520, null, 40, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000204', '10000000-0000-4000-8000-000000000003', 'true_false_clue', 100, 520, null, 40, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000205', '10000000-0000-4000-8000-000000000003', 'position_reasoning', 100, 520, null, 45, '{}'::jsonb, true),

	-- MEMORY PATTERN (5)
	('20000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000004', 'symbol_recall', 100, 520, null, 30, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000004', 'position_recall', 100, 520, null, 35, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000303', '10000000-0000-4000-8000-000000000004', 'sequence_recall', 100, 520, null, 35, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000304', '10000000-0000-4000-8000-000000000004', 'missing_element_recall', 100, 520, null, 35, '{}'::jsonb, true),
	('20000000-0000-4000-8000-000000000305', '10000000-0000-4000-8000-000000000004', 'reverse_sequence_recall', 100, 520, null, 40, '{}'::jsonb, true)
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
