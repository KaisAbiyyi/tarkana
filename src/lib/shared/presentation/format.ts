import type { ChallengeType, QuestionType, SessionStatus } from '$lib/shared/constants/challenge';

const questionLabels: Record<QuestionType, string> = {
	number_sequence: 'Number Sequence',
	symbol_pattern: 'Symbol Pattern',
	mini_deduction: 'Mini Deduction',
	memory_pattern: 'Memory Pattern'
};

const challengeLabels: Record<ChallengeType, string> = {
	quick: 'Quick Challenge',
	standard: 'Standard Challenge',
	long: 'Long Challenge',
	daily: 'Daily Challenge',
	custom: 'Custom Challenge',
	mixed: 'Mixed Challenge',
	mode: 'Mode Challenge'
};

const statusLabels: Record<SessionStatus, string> = {
	created: 'Created',
	in_progress: 'In Progress',
	completed: 'Completed',
	abandoned: 'Abandoned',
	suspicious: 'Suspicious'
};

export function formatPercent(value: number): string {
	return `${Math.round(value)}%`;
}

export function formatSeconds(value: number): string {
	if (!Number.isFinite(value) || value <= 0) return '0s';
	if (value < 60) return `${Math.round(value)}s`;

	const minutes = Math.floor(value / 60);
	const seconds = Math.round(value % 60);
	return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

export function formatSignedNumber(value: number): string {
	if (value > 0) return `+${value}`;
	return String(value);
}

export function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Unknown date';

	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

export function labelChallengeType(value: ChallengeType | string): string {
	return challengeLabels[value as ChallengeType] ?? humanize(value);
}

export function labelQuestionType(value: QuestionType | string): string {
	return questionLabels[value as QuestionType] ?? humanize(value);
}

export function labelSessionStatus(value: SessionStatus | string): string {
	return statusLabels[value as SessionStatus] ?? humanize(value);
}

export function humanize(value: string): string {
	return value
		.split(/[_-]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
