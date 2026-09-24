import { describe, expect, it } from 'vitest';
import {
	calculateCategoryMasteryUpdate,
	calculateExpectedScore,
	calculateQuestionMasteryDelta,
	DEFAULT_UNRANKED_MASTERY_PRIOR,
	MASTERY_MAX_RATING,
	MASTERY_MIN_RATING,
	MASTERY_PROVISIONAL_MIN_QUESTIONS,
	MASTERY_PROVISIONAL_MIN_SESSIONS,
	resolveInitialCategoryMasteryPrior,
	resolveQuestionDifficultyRating
} from './mastery';

describe('Category Mastery Scale Calibration & Trajectory Simulations', () => {
	describe('Entry-Level Player Plausibility', () => {
		it('ensures an unranked new player has plausible expected correctness on Easy questions', () => {
			const prior = resolveInitialCategoryMasteryPrior(0);
			expect(prior).toBe(DEFAULT_UNRANKED_MASTERY_PRIOR);
			expect(prior).toBe(400);

			// Easy scores in Tarkana range from 100 to 180
			const easy100 = resolveQuestionDifficultyRating(100); // 350
			const easy120 = resolveQuestionDifficultyRating(120); // 425
			const easy140 = resolveQuestionDifficultyRating(140); // 500
			const easy180 = resolveQuestionDifficultyRating(180); // 650

			const exp100 = calculateExpectedScore(prior, easy100);
			const exp120 = calculateExpectedScore(prior, easy120);
			const exp140 = calculateExpectedScore(prior, easy140);
			const exp180 = calculateExpectedScore(prior, easy180);

			// Expected performance on entry-level Easy questions is plausible (approx 35% - 60%)
			expect(exp100).toBeGreaterThanOrEqual(0.5);
			expect(exp100).toBeLessThanOrEqual(0.65);

			expect(exp120).toBeGreaterThanOrEqual(0.4);
			expect(exp120).toBeLessThanOrEqual(0.55);

			expect(exp140).toBeGreaterThanOrEqual(0.3);
			expect(exp140).toBeLessThanOrEqual(0.45);

			const avgExpected = (exp100 + exp120 + exp140 + exp180) / 4;
			expect(avgExpected).toBeGreaterThan(0.35);
			expect(avgExpected).toBeLessThan(0.55);
		});

		it('ensures ranked players inherit their Logic Rating prior (at least 400)', () => {
			expect(resolveInitialCategoryMasteryPrior(200)).toBe(400); // Floor at unranked prior
			expect(resolveInitialCategoryMasteryPrior(1200)).toBe(1200); // Gold Analyst prior
			expect(resolveInitialCategoryMasteryPrior(2200)).toBe(2200); // Diamond Reasoner prior
		});
	});

	describe('Representative Ratings Across All Rank Tiers', () => {
		const tiers = [
			{ name: 'Bronze Novice', rating: 400 },
			{ name: 'Silver Intermediate', rating: 800 },
			{ name: 'Gold Analyst', rating: 1200 },
			{ name: 'Platinum Strategist', rating: 1700 },
			{ name: 'Diamond Reasoner', rating: 2200 },
			{ name: 'Mastermind Elite', rating: 2700 }
		];

		const dEasy = resolveQuestionDifficultyRating(120); // 425
		const dMed = resolveQuestionDifficultyRating(260); // 1200
		const dHard = resolveQuestionDifficultyRating(435); // 2150

		it('accurately predicts 50% expected performance when player mastery matches question difficulty', () => {
			const expGoldMed = calculateExpectedScore(1200, dMed); // 1200 vs 1200
			expect(expGoldMed).toBeCloseTo(0.5, 2);

			const expDiamondHard = calculateExpectedScore(2150, dHard); // 2150 vs 2150
			expect(expDiamondHard).toBeCloseTo(0.5, 2);
		});

		it('preserves Elo sensitivity across tiers', () => {
			for (const tier of tiers) {
				const expE = calculateExpectedScore(tier.rating, dEasy);
				const expM = calculateExpectedScore(tier.rating, dMed);
				const expH = calculateExpectedScore(tier.rating, dHard);

				// Higher difficulty questions must yield strictly lower expected scores
				expect(expE).toBeGreaterThan(expM);
				expect(expM).toBeGreaterThan(expH);
			}
		});
	});

	describe('Outcome Asymmetry & Farming Resistance', () => {
		it('heavily penalizes blundering an easy question and lightly penalizes missing a hard question for advanced players', () => {
			const highRating = 1800;

			const missEasyDelta = calculateQuestionMasteryDelta({
				playerRating: highRating,
				difficultyScore: 100,
				isCorrect: false,
				isProvisional: false
			});

			const missHardDelta = calculateQuestionMasteryDelta({
				playerRating: highRating,
				difficultyScore: 450,
				isCorrect: false,
				isProvisional: false
			});

			// Blundering easy question: high expected (~0.99) -> penalty approx -8 * 0.99 = -7.92
			expect(missEasyDelta).toBeLessThan(-7.5);
			// Missing hard question: low expected (~0.08) -> penalty approx -8 * 0.08 = -0.64
			expect(missHardDelta).toBeGreaterThan(-1.0);
			expect(Math.abs(missEasyDelta)).toBeGreaterThan(Math.abs(missHardDelta) * 5);
		});

		it('asymptotically yields negligible gains when high-rated players farm easy questions', () => {
			let runningRating = 2000;
			let totalDelta = 0;

			// Player at 2000 answers 50 easy questions (difficulty score 100) correctly
			for (let i = 0; i < 50; i++) {
				const delta = calculateQuestionMasteryDelta({
					playerRating: runningRating,
					difficultyScore: 100,
					isCorrect: true,
					isProvisional: false
				});
				totalDelta += delta;
				runningRating += delta;
			}

			// Across 50 questions, total gain must be under 1 point total due to asymptotic resistance
			expect(totalDelta).toBeLessThan(1.0);
		});
	});

	describe('Trajectory Simulations', () => {
		it('Trajectory 1 (20-question trajectory): Steady learner starting at 400 rises into Silver Solver', () => {
			let rating = 400;
			let totalQuestions = 0;
			let totalSessions = 0;

			// 4 sessions of 5 questions each (Quick challenge), 80% accuracy
			for (let s = 0; s < 4; s++) {
				const sessionQuestions = [
					{ difficultyScore: 120, isCorrect: true },
					{ difficultyScore: 140, isCorrect: true },
					{ difficultyScore: 160, isCorrect: true },
					{ difficultyScore: 200, isCorrect: true },
					{ difficultyScore: 240, isCorrect: false } // 1 miss
				];

				const result = calculateCategoryMasteryUpdate({
					currentRating: rating,
					totalQuestions,
					totalSessions,
					questions: sessionQuestions
				});

				rating = result.ratingAfter;
				totalQuestions += result.ratedQuestions;
				totalSessions += 1;
			}

			expect(totalQuestions).toBe(20);
			expect(totalSessions).toBe(4);
			// After 20 questions and 4 sessions, mastery is no longer provisional
			expect(totalQuestions).toBeGreaterThanOrEqual(MASTERY_PROVISIONAL_MIN_QUESTIONS);
			expect(totalSessions).toBeGreaterThanOrEqual(MASTERY_PROVISIONAL_MIN_SESSIONS);

			// Rating has smoothly progressed from 400 into Silver Solver (500 - 999)
			expect(rating).toBeGreaterThan(500);
			expect(rating).toBeLessThan(750);
		});

		it('Trajectory 2 (50-question trajectory): Elite solver tackling Hard questions advances to Diamond', () => {
			let rating = 1850; // Platinum Strategist (1600 - 1999)
			let totalQuestions = 30; // already established
			let totalSessions = 5;

			// 5 sessions of 10 questions each (Standard challenge), 90% accuracy on Hard questions (score: 480)
			for (let s = 0; s < 5; s++) {
				const sessionQuestions = [];
				for (let q = 0; q < 10; q++) {
					sessionQuestions.push({
						difficultyScore: 480, // Hard question
						isCorrect: q < 9 // 90% correct
					});
				}

				const result = calculateCategoryMasteryUpdate({
					currentRating: rating,
					totalQuestions,
					totalSessions,
					questions: sessionQuestions
				});

				rating = result.ratingAfter;
				totalQuestions += result.ratedQuestions;
				totalSessions += 1;
			}

			expect(totalQuestions).toBe(80);
			// Advances into Diamond Reasoner tier (2000 - 2499)
			expect(rating).toBeGreaterThanOrEqual(2000);
			expect(rating).toBeLessThanOrEqual(MASTERY_MAX_RATING);
		});

		it('Trajectory 3 (100-question trajectory): Slump followed by rebound remains stable and bounded', () => {
			let rating = 1200; // Gold Analyst
			let totalQuestions = 30;
			let totalSessions = 5;

			// Phase 1: 30-question severe slump (only 30% correct on Medium questions)
			for (let s = 0; s < 3; s++) {
				const sessionQuestions = [];
				for (let q = 0; q < 10; q++) {
					sessionQuestions.push({
						difficultyScore: 260, // Medium question
						isCorrect: q < 3 // 30% correct
					});
				}

				const result = calculateCategoryMasteryUpdate({
					currentRating: rating,
					totalQuestions,
					totalSessions,
					questions: sessionQuestions
				});

				rating = result.ratingAfter;
				totalQuestions += result.ratedQuestions;
				totalSessions += 1;
			}

			// Rating dropped but remained strictly above minimum
			expect(rating).toBeLessThan(1200);
			expect(rating).toBeGreaterThan(MASTERY_MIN_RATING);

			// Phase 2: 70-question strong recovery (85% correct on Medium/Hard questions)
			for (let s = 0; s < 7; s++) {
				const sessionQuestions = [];
				for (let q = 0; q < 10; q++) {
					sessionQuestions.push({
						difficultyScore: 280,
						isCorrect: q < 9
					});
				}

				const result = calculateCategoryMasteryUpdate({
					currentRating: rating,
					totalQuestions,
					totalSessions,
					questions: sessionQuestions
				});

				rating = result.ratingAfter;
				totalQuestions += result.ratedQuestions;
				totalSessions += 1;
			}

			// Player recovered past baseline
			expect(totalQuestions).toBe(130);
			expect(rating).toBeGreaterThan(1200);
			expect(rating).toBeLessThan(MASTERY_MAX_RATING);
		});
	});
});
