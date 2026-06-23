import {
	DEFAULT_CHALLENGE_QUESTION_COUNTS,
	type ChallengeType,
	type QuestionType
} from '../../shared/constants/challenge.ts';
import { createTranslator, DEFAULT_LOCALE, type Translator } from '../../i18n/index.ts';

export type RoundSessionType = Extract<ChallengeType, 'quick' | 'standard' | 'long'>;
export type RoundMode = QuestionType | 'mixed';

export type RoundSessionOption = {
	id: RoundSessionType;
	name: string;
	description: string;
	questionCount: number;
	estimatedMinutes: number;
};

export type RoundModeOption = {
	id: RoundMode;
	name: string;
	description: string;
	categoryLabel: string;
};

export type RoundConfiguration = {
	session: RoundSessionOption;
	mode: RoundModeOption;
	startPayload: {
		challengeType: RoundSessionType;
		selectedMode?: QuestionType;
	};
};

const estimateMinutes = (questionCount: number): number =>
	Math.max(1, Math.round(questionCount / 5));

export function createRoundSessionOptions(t: Translator): readonly RoundSessionOption[] {
	return [
		{
			id: 'quick',
			name: t('label.quick'),
			description: t('round.quickBody'),
			questionCount: DEFAULT_CHALLENGE_QUESTION_COUNTS.quick,
			estimatedMinutes: estimateMinutes(DEFAULT_CHALLENGE_QUESTION_COUNTS.quick)
		},
		{
			id: 'standard',
			name: t('label.standard'),
			description: t('round.standardBody'),
			questionCount: DEFAULT_CHALLENGE_QUESTION_COUNTS.standard,
			estimatedMinutes: estimateMinutes(DEFAULT_CHALLENGE_QUESTION_COUNTS.standard)
		},
		{
			id: 'long',
			name: t('label.long'),
			description: t('round.longBody'),
			questionCount: DEFAULT_CHALLENGE_QUESTION_COUNTS.long,
			estimatedMinutes: estimateMinutes(DEFAULT_CHALLENGE_QUESTION_COUNTS.long)
		}
	];
}

export function createRoundModeOptions(t: Translator): readonly RoundModeOption[] {
	return [
		{
			id: 'mixed',
			name: t('label.mixed'),
			description: t('round.mixedBody'),
			categoryLabel: t('label.mixed')
		},
		{
			id: 'number_sequence',
			name: t('category.number'),
			description: t('round.numberBody'),
			categoryLabel: t('category.number')
		},
		{
			id: 'symbol_pattern',
			name: t('category.symbol'),
			description: t('round.symbolBody'),
			categoryLabel: t('category.symbol')
		},
		{
			id: 'mini_deduction',
			name: t('category.deduction'),
			description: t('category.deductionShort'),
			categoryLabel: t('category.deduction')
		},
		{
			id: 'memory_pattern',
			name: t('category.memory'),
			description: t('category.memoryShort'),
			categoryLabel: t('category.memory')
		}
	];
}

export const ROUND_SESSION_OPTIONS = createRoundSessionOptions(createTranslator(DEFAULT_LOCALE));
export const ROUND_MODE_OPTIONS = createRoundModeOptions(createTranslator(DEFAULT_LOCALE));

export function getRoundConfiguration(
	sessionType: RoundSessionType | null,
	mode: RoundMode | null,
	sessionOptions: readonly RoundSessionOption[] = ROUND_SESSION_OPTIONS,
	modeOptions: readonly RoundModeOption[] = ROUND_MODE_OPTIONS
): RoundConfiguration | null {
	const session = sessionOptions.find((option) => option.id === sessionType);
	const selectedMode = modeOptions.find((option) => option.id === mode);
	if (!session || !selectedMode) return null;

	return {
		session,
		mode: selectedMode,
		startPayload: {
			challengeType: session.id,
			...(selectedMode.id === 'mixed' ? {} : { selectedMode: selectedMode.id })
		}
	};
}
