import { createTranslator, formatNumber, type Locale } from '../../i18n/index.ts';

export function createArenaLabels(locale: Locale) {
	const t = createTranslator(locale);
	return {
		progress: t('arena.progress'),
		streak: t('arena.streak'),
		score: t('arena.score'),
		remainingTime: t('arena.remaining'),
		questionOf: (current: number, total: number) =>
			t('arena.questionOf', {
				current: formatNumber(locale, current),
				total: formatNumber(locale, total)
			}),
		submitAnswer: t('arena.submit'),
		submitAnswerTimeout: t('arena.submitTimeout'),
		submitting: t('arena.submitting'),
		finishingRound: t('arena.finishing'),
		nextQuestion: t('arena.nextQuestion'),
		selectHint: t('arena.selectHint'),
		activeRulesTitle: t('arena.activeRules'),
		ruleSingleAnswer: t('arena.singleAnswer'),
		ruleTimerRunning: t('arena.timerRunning'),
		ruleReviewAfterRound: t('arena.reviewAfter'),
		timerNormal: t('arena.timerNormal'),
		timerWarning: t('arena.timerWarning'),
		timerCritical: t('arena.timerCritical'),
		timerExpired: t('arena.timerExpired'),
		correctTitle: t('arena.correct'),
		correctMessage: t('arena.correctBody'),
		incorrectTitle: t('arena.incorrect'),
		incorrectMessage: t('arena.incorrectBody'),
		completeTitle: t('arena.complete'),
		completeMessage: t('arena.completeBody'),
		timeoutTitle: t('arena.timerExpired'),
		timeoutMessage: t('arena.timeoutBody'),
		scoreEarned: (points: number) =>
			t('arena.scoreEarned', { points: formatNumber(locale, points) }),
		answerChoicesLabel: t('arena.answerChoices'),
		arenaRanked: t('arena.ranked'),
		arenaOneAtATime: t('arena.oneAtATime'),
		submitErrorRetry: t('arena.submitRetry'),
		connectionLost: t('arena.connectionLost')
	} as const;
}

export type ArenaLabels = ReturnType<typeof createArenaLabels>;
