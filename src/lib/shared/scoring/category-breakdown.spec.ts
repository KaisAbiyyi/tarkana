import { describe, expect, it } from 'vitest';
import {
	calculateRoundCategoryBreakdown,
	type QuestionReviewItemInput
} from './category-breakdown';

describe('P1.9 Category Performance Breakdown Domain Logic', () => {
	it('handles empty review items gracefully', () => {
		const result = calculateRoundCategoryBreakdown([]);
		expect(result.categories).toEqual([]);
		expect(result.isSingleCategory).toBe(false);
		expect(result.strongestCategory).toBeNull();
		expect(result.weakestCategory).toBeNull();
		expect(result.canPracticeWeakest).toBe(false);
		expect(result.practiceCategory).toBeNull();
	});

	describe('Single Category (Mode / Focused Round)', () => {
		it('does NOT label the same category as both strongest and weakest when accuracy < 100', () => {
			const items: QuestionReviewItemInput[] = [
				{ questionType: 'number_sequence', isCorrect: true, timeSpentSeconds: 4, scoreEarned: 100 },
				{ questionType: 'number_sequence', isCorrect: false, timeSpentSeconds: 6, scoreEarned: 0 },
				{ questionType: 'number_sequence', isCorrect: true, timeSpentSeconds: 5, scoreEarned: 100 }
			];

			const result = calculateRoundCategoryBreakdown(items);
			expect(result.isSingleCategory).toBe(true);
			expect(result.categories).toHaveLength(1);
			expect(result.strongestCategory).toBeNull();
			expect(result.weakestCategory).toBeNull();
			expect(result.canPracticeWeakest).toBe(true);
			expect(result.practiceCategory).toBe('number_sequence');

			const cat = result.categories[0]!;
			expect(cat.questionType).toBe('number_sequence');
			expect(cat.totalQuestions).toBe(3);
			expect(cat.correctAnswers).toBe(2);
			expect(cat.wrongAnswers).toBe(1);
			expect(cat.accuracy).toBe(66.7);
			expect(cat.totalTimeSeconds).toBe(15);
			expect(cat.averageTimeSeconds).toBe(5);
			expect(cat.totalScoreEarned).toBe(200);
		});

		it('does not offer practice if single category has 100% accuracy', () => {
			const items: QuestionReviewItemInput[] = [
				{ questionType: 'symbol_pattern', isCorrect: true, timeSpentSeconds: 3, scoreEarned: 100 },
				{ questionType: 'symbol_pattern', isCorrect: true, timeSpentSeconds: 3, scoreEarned: 100 }
			];

			const result = calculateRoundCategoryBreakdown(items);
			expect(result.isSingleCategory).toBe(true);
			expect(result.strongestCategory).toBeNull();
			expect(result.weakestCategory).toBeNull();
			expect(result.canPracticeWeakest).toBe(false);
			expect(result.practiceCategory).toBeNull();
			expect(result.categories[0]?.accuracy).toBe(100);
		});
	});

	describe('Multi-Category Round', () => {
		it('identifies strongest and weakest categories correctly', () => {
			const items: QuestionReviewItemInput[] = [
				// Number Sequence: 2/2 = 100%
				{ questionType: 'number_sequence', isCorrect: true, timeSpentSeconds: 4, scoreEarned: 100 },
				{ questionType: 'number_sequence', isCorrect: true, timeSpentSeconds: 6, scoreEarned: 100 },
				// Symbol Pattern: 1/2 = 50%
				{ questionType: 'symbol_pattern', isCorrect: true, timeSpentSeconds: 5, scoreEarned: 100 },
				{ questionType: 'symbol_pattern', isCorrect: false, timeSpentSeconds: 7, scoreEarned: 0 },
				// Mini Deduction: 0/2 = 0%
				{ questionType: 'mini_deduction', isCorrect: false, timeSpentSeconds: 10, scoreEarned: 0 },
				{ questionType: 'mini_deduction', isCorrect: false, timeSpentSeconds: 12, scoreEarned: 0 }
			];

			const result = calculateRoundCategoryBreakdown(items);
			expect(result.isSingleCategory).toBe(false);
			expect(result.categories).toHaveLength(3);

			expect(result.strongestCategory?.questionType).toBe('number_sequence');
			expect(result.strongestCategory?.accuracy).toBe(100);

			expect(result.weakestCategory?.questionType).toBe('mini_deduction');
			expect(result.weakestCategory?.accuracy).toBe(0);

			expect(result.canPracticeWeakest).toBe(true);
			expect(result.practiceCategory).toBe('mini_deduction');
		});

		it('breaks ties using average time spent (slower category considered weaker)', () => {
			const items: QuestionReviewItemInput[] = [
				// Symbol Pattern: 1/2 = 50%, avg time 5s
				{ questionType: 'symbol_pattern', isCorrect: true, timeSpentSeconds: 4, scoreEarned: 100 },
				{ questionType: 'symbol_pattern', isCorrect: false, timeSpentSeconds: 6, scoreEarned: 0 },
				// Memory Pattern: 1/2 = 50%, avg time 10s (slower!)
				{ questionType: 'memory_pattern', isCorrect: true, timeSpentSeconds: 9, scoreEarned: 100 },
				{ questionType: 'memory_pattern', isCorrect: false, timeSpentSeconds: 11, scoreEarned: 0 },
				// Number Sequence: 2/2 = 100%
				{ questionType: 'number_sequence', isCorrect: true, timeSpentSeconds: 3, scoreEarned: 100 },
				{ questionType: 'number_sequence', isCorrect: true, timeSpentSeconds: 3, scoreEarned: 100 }
			];

			const result = calculateRoundCategoryBreakdown(items);
			// Strongest is number_sequence
			expect(result.strongestCategory?.questionType).toBe('number_sequence');
			// Both symbol_pattern and memory_pattern have 50% accuracy.
			// memory_pattern took 10s avg, symbol_pattern took 5s avg.
			// memory_pattern struggled more and is therefore the weakest category!
			expect(result.weakestCategory?.questionType).toBe('memory_pattern');
			expect(result.practiceCategory).toBe('memory_pattern');
		});

		it('returns null weakest category when all categories have 100% accuracy', () => {
			const items: QuestionReviewItemInput[] = [
				{ questionType: 'number_sequence', isCorrect: true, timeSpentSeconds: 4, scoreEarned: 100 },
				{ questionType: 'symbol_pattern', isCorrect: true, timeSpentSeconds: 5, scoreEarned: 100 },
				{ questionType: 'mini_deduction', isCorrect: true, timeSpentSeconds: 6, scoreEarned: 100 }
			];

			const result = calculateRoundCategoryBreakdown(items);
			expect(result.isSingleCategory).toBe(false);
			expect(result.strongestCategory?.questionType).toBe('number_sequence'); // fastest 100%
			expect(result.weakestCategory).toBeNull();
			expect(result.canPracticeWeakest).toBe(false);
			expect(result.practiceCategory).toBeNull();
		});
	});
});
