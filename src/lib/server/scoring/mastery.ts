import type { ChallengeType } from '$lib/shared/constants/challenge';

export const MASTERY_PROVISIONAL_MIN_QUESTIONS = 20;
export const MASTERY_PROVISIONAL_MIN_SESSIONS = 3;
export const MASTERY_RATING_VERSION = 2;
export const MASTERY_MIN_RATING = 0;
export const MASTERY_MAX_RATING = 3000;
export const DEFAULT_UNRANKED_MASTERY_PRIOR = 400;

export const K_PROVISIONAL = 16;
export const K_ESTABLISHED = 8;

export interface MasteryQuestionResult {
	difficultyScore: number;
	isCorrect: boolean;
}

export interface CategoryMasteryInput {
	currentRating: number;
	totalQuestions: number;
	totalSessions: number;
	questions: MasteryQuestionResult[];
}

export interface CategoryMasteryUpdateResult {
	ratingBefore: number;
	ratingAfter: number;
	ratingDelta: number;
	ratedQuestions: number;
	correctAnswers: number;
	isProvisional: boolean;
}

/**
 * Resolves the baseline prior rating for a user when attempting a category for the first time.
 * Unranked users initialize at DEFAULT_UNRANKED_MASTERY_PRIOR (400, Bronze Mind midpoint).
 * Ranked users inherit their global Logic Rating prior (at least 400).
 */
export function resolveInitialCategoryMasteryPrior(logicRating?: number | null): number {
	const safeRating =
		typeof logicRating === 'number' && Number.isFinite(logicRating) ? Math.max(0, logicRating) : 0;
	return safeRating > 0
		? Math.max(DEFAULT_UNRANKED_MASTERY_PRIOR, safeRating)
		: DEFAULT_UNRANKED_MASTERY_PRIOR;
}

/**
 * Maps a question's raw difficulty score into an Elo-compatible difficulty rating.
 *
 * In Tarkana (Calibrated Version 2):
 * - Easy range: 100 - 180  -> mapped to 350 - 650 (Bronze / Silver boundary)
 * - Medium range: 200 - 320 -> mapped to 900 - 1500 (Gold tier)
 * - Hard range: 350 - 520+ -> mapped to 1750 - 2550+ (Platinum to Mastermind)
 */
export function resolveQuestionDifficultyRating(difficultyScore: number): number {
	const score = Number.isFinite(difficultyScore) ? Math.max(1, difficultyScore) : 100;

	if (score <= 180) {
		const t = Math.max(0, Math.min(1, (score - 100) / 80));
		return Math.round(350 + t * 300);
	}
	if (score <= 320) {
		const t = Math.max(0, Math.min(1, (score - 200) / 120));
		return Math.round(900 + t * 600);
	}
	const t = Math.max(0, Math.min(1.5, (score - 350) / 170));
	return Math.round(1750 + t * 800);
}

/**
 * Computes standard logistic expected score E in [0, 1].
 */
export function calculateExpectedScore(
	playerRating: number,
	questionDifficultyRating: number
): number {
	return 1 / (1 + Math.pow(10, (questionDifficultyRating - playerRating) / 400));
}

/**
 * Computes the continuous rating delta for a single question response.
 */
export function calculateQuestionMasteryDelta(input: {
	playerRating: number;
	difficultyScore: number;
	isCorrect: boolean;
	isProvisional: boolean;
}): number {
	const K = input.isProvisional ? K_PROVISIONAL : K_ESTABLISHED;
	const questionDiff = resolveQuestionDifficultyRating(input.difficultyScore);
	const expected = calculateExpectedScore(input.playerRating, questionDiff);
	const actual = input.isCorrect ? 1 : 0;
	return K * (actual - expected);
}

/**
 * Evaluates whether category mastery is considered provisional based on sample volume.
 */
export function isCategoryMasteryProvisional(
	totalQuestions: number,
	totalSessions: number
): boolean {
	return (
		totalQuestions < MASTERY_PROVISIONAL_MIN_QUESTIONS ||
		totalSessions < MASTERY_PROVISIONAL_MIN_SESSIONS
	);
}

export type MasteryEligibleChallengeType = 'quick' | 'standard' | 'long' | 'mode';

/**
 * Evaluates whether a challenge type is eligible to mutate Category Mastery.
 *
 * Eligible: quick, standard, long, mode (ranked competitive sessions).
 * Ineligible: daily (fixed snapshot), duel (replay snapshot), custom (arbitrary parameters).
 */
export function isMasteryEligibleChallengeType(
	challengeType: ChallengeType | string | null | undefined
): challengeType is MasteryEligibleChallengeType {
	return (
		challengeType === 'quick' ||
		challengeType === 'standard' ||
		challengeType === 'long' ||
		challengeType === 'mode'
	);
}

/**
 * Derives accuracy percentage rounded to 1 decimal place from counts.
 */
export function deriveCategoryAccuracy(totalQuestions: number, correctAnswers: number): number {
	if (totalQuestions <= 0) return 0;
	return Math.round((Math.max(0, correctAnswers) / totalQuestions) * 1000) / 10;
}

/**
 * Computes the new category mastery state after applying all answered questions in a session.
 * Updates are applied incrementally per question in session order, reflecting intra-session progress.
 */
export function calculateCategoryMasteryUpdate(
	input: CategoryMasteryInput
): CategoryMasteryUpdateResult {
	const ratedQuestions = input.questions.length;
	let correctAnswers = 0;

	if (ratedQuestions === 0) {
		return {
			ratingBefore: input.currentRating,
			ratingAfter: input.currentRating,
			ratingDelta: 0,
			ratedQuestions: 0,
			correctAnswers: 0,
			isProvisional: isCategoryMasteryProvisional(input.totalQuestions, input.totalSessions)
		};
	}

	const isProv = isCategoryMasteryProvisional(input.totalQuestions, input.totalSessions);
	let runningRating = input.currentRating;

	for (const q of input.questions) {
		if (q.isCorrect) {
			correctAnswers += 1;
		}
		const delta = calculateQuestionMasteryDelta({
			playerRating: runningRating,
			difficultyScore: q.difficultyScore,
			isCorrect: q.isCorrect,
			isProvisional: isProv
		});
		runningRating += delta;
	}

	const ratingBefore = input.currentRating;
	const ratingAfter = Math.max(
		MASTERY_MIN_RATING,
		Math.min(MASTERY_MAX_RATING, Math.round(runningRating))
	);
	const ratingDelta = ratingAfter - ratingBefore;

	return {
		ratingBefore,
		ratingAfter,
		ratingDelta,
		ratedQuestions,
		correctAnswers,
		isProvisional: isProv
	};
}
