import { QUESTION_TYPES, type QuestionType } from '$lib/shared/constants/challenge';

export interface QuestionReviewItemInput {
	questionType: string;
	isCorrect: boolean;
	timeSpentSeconds: number;
	scoreEarned: number;
}

export interface CategoryPerformance {
	questionType: QuestionType;
	totalQuestions: number;
	correctAnswers: number;
	wrongAnswers: number;
	accuracy: number;
	totalTimeSeconds: number;
	averageTimeSeconds: number;
	totalScoreEarned: number;
}

export interface RoundCategorySummary {
	categories: CategoryPerformance[];
	isSingleCategory: boolean;
	strongestCategory: CategoryPerformance | null;
	weakestCategory: CategoryPerformance | null;
	canPracticeWeakest: boolean;
	practiceCategory: QuestionType | null;
}

/**
 * Calculates per-round performance breakdown grouped by canonical questionType.
 * NOTE: This is an ephemeral round diagnostic, NOT a persistent player rating or mastery metric.
 */
export function calculateRoundCategoryBreakdown(
	reviewItems: QuestionReviewItemInput[]
): RoundCategorySummary {
	if (!reviewItems || reviewItems.length === 0) {
		return {
			categories: [],
			isSingleCategory: false,
			strongestCategory: null,
			weakestCategory: null,
			canPracticeWeakest: false,
			practiceCategory: null
		};
	}

	const grouped = new Map<QuestionType, QuestionReviewItemInput[]>();

	for (const item of reviewItems) {
		const type = isKnownQuestionType(item.questionType) ? item.questionType : 'number_sequence';
		const list = grouped.get(type) ?? [];
		list.push(item);
		grouped.set(type, list);
	}

	const performances: CategoryPerformance[] = [];

	for (const [questionType, items] of grouped.entries()) {
		const totalQuestions = items.length;
		const correctAnswers = items.filter((i) => i.isCorrect).length;
		const wrongAnswers = totalQuestions - correctAnswers;
		const accuracy =
			totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 1000) / 10 : 0;
		const totalTimeSeconds =
			Math.round(items.reduce((sum, i) => sum + (Math.max(0, i.timeSpentSeconds) || 0), 0) * 10) /
			10;
		const averageTimeSeconds =
			totalQuestions > 0 ? Math.round((totalTimeSeconds / totalQuestions) * 10) / 10 : 0;
		const totalScoreEarned = items.reduce((sum, i) => sum + (i.scoreEarned || 0), 0);

		performances.push({
			questionType,
			totalQuestions,
			correctAnswers,
			wrongAnswers,
			accuracy,
			totalTimeSeconds,
			averageTimeSeconds,
			totalScoreEarned
		});
	}

	// Sort categories by performance: accuracy DESC, averageTimeSeconds ASC, questionType ASC
	performances.sort((a, b) => {
		if (b.accuracy !== a.accuracy) {
			return b.accuracy - a.accuracy;
		}
		if (a.averageTimeSeconds !== b.averageTimeSeconds) {
			return a.averageTimeSeconds - b.averageTimeSeconds;
		}
		return a.questionType.localeCompare(b.questionType);
	});

	const isSingleCategory = performances.length === 1;

	if (isSingleCategory) {
		const single = performances[0]!;
		const canPractice = single.accuracy < 100;
		return {
			categories: performances,
			isSingleCategory: true,
			strongestCategory: null,
			weakestCategory: null,
			canPracticeWeakest: canPractice,
			practiceCategory: canPractice ? single.questionType : null
		};
	}

	// Multi-category round:
	// Strongest: top of the sorted list
	const strongestCategory = performances[0] ?? null;

	// Check if all categories achieved 100% accuracy
	const allPerfect = performances.every((c) => c.accuracy === 100);

	let weakestCategory: CategoryPerformance | null = null;
	if (!allPerfect) {
		// Find lowest accuracy; tie-break: highest average time, then alphabetical
		const candidates = [...performances].sort((a, b) => {
			if (a.accuracy !== b.accuracy) {
				return a.accuracy - b.accuracy;
			}
			if (b.averageTimeSeconds !== a.averageTimeSeconds) {
				return b.averageTimeSeconds - a.averageTimeSeconds;
			}
			return a.questionType.localeCompare(b.questionType);
		});
		weakestCategory = candidates[0] ?? null;
	}

	const canPracticeWeakest = weakestCategory !== null;
	const practiceCategory = weakestCategory ? weakestCategory.questionType : null;

	return {
		categories: performances,
		isSingleCategory: false,
		strongestCategory,
		weakestCategory,
		canPracticeWeakest,
		practiceCategory
	};
}

function isKnownQuestionType(val: string): val is QuestionType {
	return (QUESTION_TYPES as readonly string[]).includes(val);
}
