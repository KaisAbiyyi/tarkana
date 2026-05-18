import type {
	ChallengeType,
	DifficultyBand,
	QuestionType,
	SessionStatus
} from '$lib/shared/constants/challenge';

export type ChallengeConfigDto = {
	id: string;
	name: string;
	challengeType: ChallengeType;
	questionCount: number;
	modeDistribution: Record<string, unknown> | null;
	difficultyDistribution: Record<string, unknown> | null;
	isActive: boolean;
};

export type CategoryDto = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	isActive: boolean;
};

export type QuestionRuleDto = {
	id: string;
	categoryId: string;
	ruleType: string;
	difficultyMin: number;
	difficultyMax: number;
	timeLimitSeconds: number;
	config: Record<string, unknown>;
	isActive: boolean;
};

export type SessionListItemDto = {
	id: string;
	challengeType: ChallengeType;
	status: SessionStatus;
	totalQuestions: number;
	totalScore: number;
	accuracy: number;
	averageTimeSeconds: number;
	ratingDelta: number;
	rankAfter: string;
	createdAt: string;
};

export type SessionQuestionSafeDto = {
	id: string;
	questionType: QuestionType;
	categoryId: string;
	prompt: string;
	choices: string[];
	difficultyBand?: DifficultyBand;
	difficultyScore: number;
	timeLimitSeconds: number;
	metadata: Record<string, unknown>;
	generatedSeed: string;
	orderIndex: number;
};
