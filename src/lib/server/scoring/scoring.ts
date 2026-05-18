export type QuestionScoreInput = {
	isCorrect: boolean;
	difficultyScore: number;
	timeSpentSeconds: number;
	timeLimitSeconds: number;
};

export type AnswerScoreItem = QuestionScoreInput & {
	scoreEarned?: number;
};

export type SessionScoreSummary = {
	totalQuestionScore: number;
	accuracyBonus: number;
	streakBonus: number;
	totalScore: number;
	accuracy: number;
	correctAnswers: number;
	wrongAnswers: number;
	totalTimeSeconds: number;
	averageTimeSeconds: number;
};

export function calculateQuestionScore(input: QuestionScoreInput): number {
	validateScoreInput(input);
	if (!input.isCorrect) return 0;

	return Math.round(input.difficultyScore * getTimeMultiplier(input));
}

export function getTimeMultiplier(input: {
	timeSpentSeconds: number;
	timeLimitSeconds: number;
}): number {
	if (input.timeSpentSeconds >= input.timeLimitSeconds) return 0;
	const remainingRatio = (input.timeLimitSeconds - input.timeSpentSeconds) / input.timeLimitSeconds;

	if (remainingRatio >= 0.75) return 1.5;
	if (remainingRatio >= 0.5) return 1.3;
	if (remainingRatio >= 0.25) return 1.1;
	if (remainingRatio > 0) return 1.0;
	return 0;
}

export function calculateAccuracyBonus(accuracy: number): number {
	if (accuracy >= 100) return 150;
	if (accuracy >= 90) return 100;
	if (accuracy >= 80) return 60;
	if (accuracy >= 70) return 30;
	return 0;
}

export function calculateStreakBonus(results: readonly boolean[]): number {
	let currentStreak = 0;
	let bonus = 0;

	for (const isCorrect of results) {
		if (!isCorrect) {
			currentStreak = 0;
			continue;
		}

		currentStreak += 1;
		if (currentStreak === 3) bonus += 20;
		if (currentStreak === 5) bonus += 50;
		if (currentStreak === 10) bonus += 120;
	}

	return bonus;
}

export function calculateSessionScore(items: readonly AnswerScoreItem[]): SessionScoreSummary {
	if (items.length === 0) {
		return {
			totalQuestionScore: 0,
			accuracyBonus: 0,
			streakBonus: 0,
			totalScore: 0,
			accuracy: 0,
			correctAnswers: 0,
			wrongAnswers: 0,
			totalTimeSeconds: 0,
			averageTimeSeconds: 0
		};
	}

	const scores = items.map((item) => item.scoreEarned ?? calculateQuestionScore(item));
	const correctAnswers = items.filter((item) => item.isCorrect).length;
	const totalQuestionScore = scores.reduce((sum, score) => sum + score, 0);
	const accuracy = Math.round((correctAnswers / items.length) * 10000) / 100;
	const accuracyBonus = calculateAccuracyBonus(accuracy);
	const streakBonus = calculateStreakBonus(items.map((item) => item.isCorrect));
	const totalTimeSeconds = items.reduce((sum, item) => sum + item.timeSpentSeconds, 0);

	return {
		totalQuestionScore,
		accuracyBonus,
		streakBonus,
		totalScore: totalQuestionScore + accuracyBonus + streakBonus,
		accuracy,
		correctAnswers,
		wrongAnswers: items.length - correctAnswers,
		totalTimeSeconds,
		averageTimeSeconds: Math.round((totalTimeSeconds / items.length) * 100) / 100
	};
}

function validateScoreInput(input: QuestionScoreInput): void {
	if (!Number.isFinite(input.difficultyScore) || input.difficultyScore <= 0) {
		throw new Error('difficultyScore must be positive');
	}
	if (!Number.isFinite(input.timeLimitSeconds) || input.timeLimitSeconds <= 0) {
		throw new Error('timeLimitSeconds must be positive');
	}
	if (!Number.isFinite(input.timeSpentSeconds) || input.timeSpentSeconds < 0) {
		throw new Error('timeSpentSeconds must be zero or greater');
	}
}
