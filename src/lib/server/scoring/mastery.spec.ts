import { describe, expect, it } from 'vitest';
import {
	calculateCategoryMasteryUpdate,
	calculateExpectedScore,
	calculateQuestionMasteryDelta,
	deriveCategoryAccuracy,
	isCategoryMasteryProvisional,
	isMasteryEligibleChallengeType,
	resolveQuestionDifficultyRating,
	MASTERY_MAX_RATING,
	MASTERY_MIN_RATING,
	MASTERY_PROVISIONAL_MIN_QUESTIONS,
	MASTERY_PROVISIONAL_MIN_SESSIONS
} from './mastery';

describe('P1.10A Category Mastery Engine & Elo Calibration', () => {
	describe('Mathematical Invariants', () => {
		it('INVARIANT 1: Harder correct answers never reward less than easier correct answers at identical mastery', () => {
			const testRatings = [400, 800, 1200, 1600, 2000, 2400];
			const easyScore = 120; // Easy
			const mediumScore = 260; // Medium
			const hardScore = 450; // Hard

			for (const rating of testRatings) {
				const deltaEasy = calculateQuestionMasteryDelta({
					playerRating: rating,
					difficultyScore: easyScore,
					isCorrect: true,
					isProvisional: false
				});
				const deltaMedium = calculateQuestionMasteryDelta({
					playerRating: rating,
					difficultyScore: mediumScore,
					isCorrect: true,
					isProvisional: false
				});
				const deltaHard = calculateQuestionMasteryDelta({
					playerRating: rating,
					difficultyScore: hardScore,
					isCorrect: true,
					isProvisional: false
				});

				expect(deltaHard).toBeGreaterThan(deltaMedium);
				expect(deltaMedium).toBeGreaterThan(deltaEasy);
			}
		});

		it('INVARIANT 2: Easy-question farming asymptotically produces negligible gains at high mastery', () => {
			const eliteRating = 2600; // Mastermind
			const easyQuestionScore = 110; // Entry-level easy

			// Single question delta for elite on easy question
			const singleDelta = calculateQuestionMasteryDelta({
				playerRating: eliteRating,
				difficultyScore: easyQuestionScore,
				isCorrect: true,
				isProvisional: false
			});

			// Expected score should be practically 1.0 (>= 0.9999)
			const expected = calculateExpectedScore(
				eliteRating,
				resolveQuestionDifficultyRating(easyQuestionScore)
			);
			expect(expected).toBeGreaterThan(0.999);
			expect(singleDelta).toBeLessThan(0.01);

			// A full 10-question farming session of easy questions produces 0 net integer rating gain
			const update = calculateCategoryMasteryUpdate({
				currentRating: eliteRating,
				totalQuestions: 100,
				totalSessions: 10,
				questions: Array(10).fill({ difficultyScore: easyQuestionScore, isCorrect: true })
			});

			expect(update.ratingDelta).toBe(0);
			expect(update.ratingAfter).toBe(eliteRating);
		});

		it('INVARIANT 3: Harder mistakes penalize less than unexpectedly easy mistakes', () => {
			const playerRating = 1500;
			const easyScore = 120;
			const hardScore = 450;

			const penaltyEasyBlunder = calculateQuestionMasteryDelta({
				playerRating,
				difficultyScore: easyScore,
				isCorrect: false,
				isProvisional: false
			});
			const penaltyHardMiss = calculateQuestionMasteryDelta({
				playerRating,
				difficultyScore: hardScore,
				isCorrect: false,
				isProvisional: false
			});

			// Penalties are negative numbers. Easy blunder should be much more negative (harsher penalty).
			expect(penaltyEasyBlunder).toBeLessThan(0);
			expect(penaltyHardMiss).toBeLessThan(0);
			expect(Math.abs(penaltyEasyBlunder)).toBeGreaterThan(Math.abs(penaltyHardMiss));
		});

		it('INVARIANT 4: Updates are strictly bounded within [0, 3000]', () => {
			// At rating 0 with all misses: stays >= 0
			const zeroMiss = calculateCategoryMasteryUpdate({
				currentRating: 0,
				totalQuestions: 50,
				totalSessions: 5,
				questions: Array(10).fill({ difficultyScore: 100, isCorrect: false })
			});
			expect(zeroMiss.ratingAfter).toBe(MASTERY_MIN_RATING);

			// At rating 3000 with all correct: stays <= 3000
			const maxCorrect = calculateCategoryMasteryUpdate({
				currentRating: 3000,
				totalQuestions: 50,
				totalSessions: 5,
				questions: Array(10).fill({ difficultyScore: 500, isCorrect: true })
			});
			expect(maxCorrect.ratingAfter).toBe(MASTERY_MAX_RATING);
		});

		it('INVARIANT 5: Question difficulty rating function is strictly monotonic with difficultyScore', () => {
			let previousRating = 0;
			for (let score = 100; score <= 550; score += 25) {
				const rating = resolveQuestionDifficultyRating(score);
				expect(rating).toBeGreaterThanOrEqual(previousRating);
				previousRating = rating;
			}
		});
	});

	describe('Provisional Status Contract', () => {
		it('marks category mastery as provisional if questions < 20 or sessions < 3', () => {
			expect(MASTERY_PROVISIONAL_MIN_QUESTIONS).toBe(20);
			expect(MASTERY_PROVISIONAL_MIN_SESSIONS).toBe(3);
			expect(isCategoryMasteryProvisional(0, 0)).toBe(true);
			expect(isCategoryMasteryProvisional(19, 5)).toBe(true);
			expect(isCategoryMasteryProvisional(25, 2)).toBe(true);
			expect(isCategoryMasteryProvisional(20, 3)).toBe(false);
			expect(isCategoryMasteryProvisional(50, 10)).toBe(false);
		});

		it('uses K_PROVISIONAL (16) when provisional and K_ESTABLISHED (8) when established', () => {
			const rating = 1200;
			const score = 260; // Expected ~ 0.5

			const deltaProv = calculateQuestionMasteryDelta({
				playerRating: rating,
				difficultyScore: score,
				isCorrect: true,
				isProvisional: true
			});

			const deltaEst = calculateQuestionMasteryDelta({
				playerRating: rating,
				difficultyScore: score,
				isCorrect: true,
				isProvisional: false
			});

			expect(deltaProv).toBeCloseTo(deltaEst * 2, 1);
		});
	});

	describe('Challenge Type Eligibility Contract', () => {
		it('permits mastery mutation only for quick, standard, long, and mode', () => {
			expect(isMasteryEligibleChallengeType('quick')).toBe(true);
			expect(isMasteryEligibleChallengeType('standard')).toBe(true);
			expect(isMasteryEligibleChallengeType('long')).toBe(true);
			expect(isMasteryEligibleChallengeType('mode')).toBe(true);

			// Excluded types
			expect(isMasteryEligibleChallengeType('daily')).toBe(false);
			expect(isMasteryEligibleChallengeType('duel')).toBe(false);
			expect(isMasteryEligibleChallengeType('custom')).toBe(false);
		});
	});

	describe('Derived Accuracy Contract', () => {
		it('derives accurate rounded percentages from counts without storing duplicate columns', () => {
			expect(deriveCategoryAccuracy(0, 0)).toBe(0);
			expect(deriveCategoryAccuracy(10, 8)).toBe(80.0);
			expect(deriveCategoryAccuracy(3, 2)).toBe(66.7);
			expect(deriveCategoryAccuracy(3, 1)).toBe(33.3);
			expect(deriveCategoryAccuracy(10, 10)).toBe(100.0);
		});
	});

	describe('Multi-Question Session Mastery Calibration', () => {
		it('handles empty questions list gracefully with 0 delta', () => {
			const update = calculateCategoryMasteryUpdate({
				currentRating: 1200,
				totalQuestions: 25,
				totalSessions: 3,
				questions: []
			});

			expect(update.ratingBefore).toBe(1200);
			expect(update.ratingAfter).toBe(1200);
			expect(update.ratingDelta).toBe(0);
			expect(update.ratedQuestions).toBe(0);
		});

		it('accumulates sequential question updates deterministically', () => {
			const update = calculateCategoryMasteryUpdate({
				currentRating: 1000,
				totalQuestions: 25,
				totalSessions: 3,
				questions: [
					{ difficultyScore: 200, isCorrect: true },
					{ difficultyScore: 250, isCorrect: true },
					{ difficultyScore: 300, isCorrect: false },
					{ difficultyScore: 280, isCorrect: true },
					{ difficultyScore: 310, isCorrect: true }
				]
			});

			expect(update.ratingBefore).toBe(1000);
			expect(update.ratedQuestions).toBe(5);
			expect(update.correctAnswers).toBe(4);
			expect(update.ratingAfter).toBeGreaterThan(1000);
			expect(update.ratingDelta).toBe(update.ratingAfter - update.ratingBefore);
		});
	});
});
