import type { ChallengeType, DifficultyBand, QuestionType } from '$lib/shared/constants/challenge';

export type JsonRecord = Record<string, unknown>;

export type GeneratedQuestion = {
	questionType: QuestionType;
	prompt: string;
	choices: string[];
	correctAnswer: string;
	explanation: string;
	difficultyScore: number;
	timeLimitSeconds: number;
	metadata: JsonRecord;
	generatedSeed: string;
};

export type BuiltChallengeQuestion = GeneratedQuestion & {
	categoryId: string;
};

export type ActiveQuestionDto = Omit<GeneratedQuestion, 'correctAnswer' | 'explanation'> & {
	sessionQuestionId: string;
	categoryId: string;
	orderIndex: number;
};

export type ResultQuestionReviewDto = GeneratedQuestion & {
	sessionQuestionId: string;
	categoryId: string;
	orderIndex: number;
	selectedAnswer: string | null;
	isCorrect: boolean;
	timeSpentSeconds: number;
	scoreEarned: number;
};

export type QuestionRuleDefinition = {
	id: string;
	categoryId: string;
	questionType: QuestionType;
	ruleType: string;
	difficultyMin: number;
	difficultyMax: number;
	difficultyBand: DifficultyBand | null;
	timeLimitSeconds: number;
	config: JsonRecord;
	isActive: boolean;
};

export type ChallengeCategoryDefinition = {
	id: string;
	questionType: QuestionType;
	slug: string;
	isActive: boolean;
};

export type ChallengeConfigDefinition = {
	id?: string;
	name: string;
	challengeType: ChallengeType;
	questionCount: number;
	modeDistribution: JsonRecord | null;
	difficultyDistribution: JsonRecord | null;
	isActive: boolean;
};

export type GenerateQuestionInput = {
	seed: string;
	difficulty: DifficultyBand;
	ruleType: string;
	timeLimitSeconds: number;
	config?: JsonRecord;
};

export type QuestionGenerator = (input: GenerateQuestionInput) => GeneratedQuestion;

export type ChallengeBuildInput = {
	config: ChallengeConfigDefinition;
	categories: ChallengeCategoryDefinition[];
	rules: QuestionRuleDefinition[];
	userRating: number;
	selectedMode?: QuestionType;
	seed: string;
};

export type DifficultyDistribution = Record<DifficultyBand, number>;
