import type {
	ChallengeType,
	DifficultyBand,
	QuestionType,
	SessionStatus
} from '../../shared/constants/challenge.ts';
import { DEFAULT_LOCALE, translate, type Locale, type MessageKey } from '../../i18n/index.ts';
import type { RankName } from '../../shared/constants/rank.ts';

const questionLabels: Record<QuestionType, MessageKey> = {
	number_sequence: 'category.number',
	symbol_pattern: 'category.symbol',
	mini_deduction: 'category.deduction',
	memory_pattern: 'category.memory'
};

const challengeLabels: Record<ChallengeType, MessageKey> = {
	quick: 'label.quick',
	standard: 'label.standard',
	long: 'label.long',
	daily: 'label.daily',
	custom: 'label.custom',
	mixed: 'label.mixed',
	mode: 'label.practice'
};

const statusLabels: Record<SessionStatus, MessageKey> = {
	created: 'label.created',
	in_progress: 'label.inProgress',
	completed: 'label.completed',
	abandoned: 'label.abandoned'
};

const difficultyLabels: Record<DifficultyBand, MessageKey> = {
	easy: 'label.easy',
	medium: 'label.medium',
	hard: 'label.hard'
};

const rankLabels: Record<RankName, MessageKey> = {
	Unranked: 'rank.unranked',
	'Bronze Mind': 'rank.bronzeMind',
	'Silver Solver': 'rank.silverSolver',
	'Gold Analyst': 'rank.goldAnalyst',
	'Platinum Strategist': 'rank.platinumStrategist',
	'Diamond Reasoner': 'rank.diamondReasoner',
	Mastermind: 'rank.mastermind'
};

const achievementLabels: Record<string, MessageKey> = {
	new_rank: 'achievement.newRank',
	best_score_standard: 'achievement.bestScoreStandard',
	best_score_quick: 'achievement.bestScoreQuick',
	best_score_long: 'achievement.bestScoreLong',
	best_format: 'achievement.bestFormat',
	improved: 'achievement.improved',
	tied_best_accuracy: 'achievement.tiedBestAccuracy',
	best_accuracy: 'achievement.bestAccuracy',
	fastest_time: 'achievement.fastestTime'
};

export function formatPercent(value: number, locale: Locale = DEFAULT_LOCALE): string {
	if (!Number.isFinite(value)) return '0%';
	return new Intl.NumberFormat(locale, {
		style: 'percent',
		maximumFractionDigits: 1
	}).format(value / 100);
}

export function formatSeconds(value: number, locale: Locale = DEFAULT_LOCALE): string {
	if (!Number.isFinite(value) || value <= 0)
		return translate(locale, 'format.secondsShort', { value: formatNumber(0, locale) });
	if (value < 60)
		return translate(locale, 'format.secondsShort', {
			value: formatNumber(Math.round(value), locale)
		});

	const minutes = Math.floor(value / 60);
	const seconds = Math.round(value % 60);
	return seconds === 0
		? translate(locale, 'format.minutesShort', { value: formatNumber(minutes, locale) })
		: translate(locale, 'format.minutesSeconds', {
				minutes: formatNumber(minutes, locale),
				seconds: formatNumber(seconds, locale)
			});
}

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
	if (!Number.isFinite(value)) return '0';
	return new Intl.NumberFormat(locale).format(value);
}

export function formatSignedNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
	if (value > 0) return `+${formatNumber(value, locale)}`;
	return formatNumber(value, locale);
}

export function formatDateTime(value: string, locale: Locale = DEFAULT_LOCALE): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return translate(locale, 'format.unknownDate');

	return new Intl.DateTimeFormat(locale, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

export function labelChallengeType(
	value: ChallengeType | string,
	locale: Locale = DEFAULT_LOCALE
): string {
	const key = challengeLabels[value as ChallengeType];
	return key ? translate(locale, key) : humanize(value);
}

export function labelQuestionType(
	value: QuestionType | string,
	locale: Locale = DEFAULT_LOCALE
): string {
	const key = questionLabels[value as QuestionType];
	return key ? translate(locale, key) : humanize(value);
}

export function labelSessionStatus(
	value: SessionStatus | string,
	locale: Locale = DEFAULT_LOCALE
): string {
	const key = statusLabels[value as SessionStatus];
	return key ? translate(locale, key) : humanize(value);
}

export function labelDifficultyScore(score: number, locale: Locale = DEFAULT_LOCALE): string {
	if (score <= 60) return translate(locale, difficultyLabels.easy);
	if (score <= 120) return translate(locale, difficultyLabels.medium);
	return translate(locale, difficultyLabels.hard);
}

export function labelDifficultyBand(
	band: DifficultyBand | string,
	locale: Locale = DEFAULT_LOCALE
): string {
	const key = difficultyLabels[band as DifficultyBand];
	return key ? translate(locale, key) : humanize(band);
}

export function labelMode(
	mode: 'mixed' | QuestionType | string,
	locale: Locale = DEFAULT_LOCALE
): string {
	if (mode === 'mixed') return translate(locale, 'label.mixed');
	return labelQuestionType(mode as QuestionType, locale);
}

export function labelRank(rank: RankName | string, locale: Locale = DEFAULT_LOCALE): string {
	const key = rankLabels[rank as RankName];
	return key ? translate(locale, key) : humanize(rank);
}

export function labelAchievement(code: string, locale: Locale = DEFAULT_LOCALE): string {
	const key = achievementLabels[code];
	return key ? translate(locale, key) : humanize(code);
}

export function labelSessionType(
	session: {
		challengeType: ChallengeType | string;
		totalQuestions: number;
	},
	locale: Locale = DEFAULT_LOCALE
): string {
	if (session.challengeType === 'quick') return translate(locale, 'label.quick');
	if (session.challengeType === 'long') return translate(locale, 'label.long');
	if (session.challengeType === 'standard') return translate(locale, 'label.standard');
	if (session.challengeType === 'daily') return translate(locale, 'label.daily');
	if (session.challengeType === 'custom') return translate(locale, 'label.custom');

	if (session.totalQuestions <= 5) return translate(locale, 'label.quick');
	if (session.totalQuestions <= 10) return translate(locale, 'label.standard');
	return translate(locale, 'label.long');
}

export function humanize(value: string): string {
	return value
		.split(/[_-]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
