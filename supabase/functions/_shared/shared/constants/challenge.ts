export const QUESTION_TYPES = [
	'number_sequence',
	'symbol_pattern',
	'mini_deduction',
	'memory_pattern'
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const CHALLENGE_TYPES = [
	'quick',
	'standard',
	'long',
	'daily',
	'custom',
	'mixed',
	'mode'
] as const;

export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const DIFFICULTY_BANDS = ['easy', 'medium', 'hard'] as const;

export type DifficultyBand = (typeof DIFFICULTY_BANDS)[number];

export const SESSION_STATUSES = ['created', 'in_progress', 'completed', 'abandoned'] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const DEFAULT_CHALLENGE_QUESTION_COUNTS: Record<ChallengeType, number> = {
	quick: 5,
	standard: 10,
	long: 20,
	daily: 10,
	custom: 10,
	mixed: 10,
	mode: 10
};
