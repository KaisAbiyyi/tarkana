import type {
	Category,
	ChallengeConfig,
	ChallengeSession,
	NewChallengeSession,
	NewSessionAnswer,
	NewSessionQuestion,
	QuestionRule,
	SessionAnswer,
	SessionQuestion
} from '$lib/server/db/schema';
import type {
	CompleteSessionAndProfileInput,
	CompleteSessionInput,
	DashboardSessionStats,
	SessionRepository
} from '$lib/server/db/repositories/session-repository';

export function createChallengeSession(
	overrides: Partial<ChallengeSession> = {}
): ChallengeSession {
	const now = new Date('2026-01-01T00:00:00.000Z');
	return {
		id: '11111111-1111-4111-8111-111111111111',
		userId: '11111111-1111-4111-8111-111111111111',
		challengeType: 'quick',
		status: 'in_progress',
		totalQuestions: 1,
		totalScore: 0,
		accuracy: 0,
		totalTimeSeconds: 0,
		averageTimeSeconds: 0,
		ratingBefore: 0,
		ratingAfter: 0,
		ratingDelta: 0,
		rankBefore: 'Unranked',
		rankAfter: 'Unranked',
		isSuspicious: false,
		suspiciousReason: null,
		createdAt: now,
		updatedAt: now,
		completedAt: null,
		...overrides
	};
}

export function createSessionQuestion(overrides: Partial<SessionQuestion> = {}): SessionQuestion {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		sessionId: '11111111-1111-4111-8111-111111111111',
		questionType: 'number_sequence',
		categoryId: '11111111-1111-4111-8111-111111111111',
		prompt: 'Find next: 1, 2, 3, ?',
		choices: ['4', '5', '6', '7'],
		correctAnswer: '4',
		explanation: 'Add one.',
		difficultyScore: 100,
		timeLimitSeconds: 20,
		metadata: { ruleType: 'arithmetic_sequence' },
		generatedSeed: 'seed',
		orderIndex: 0,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		...overrides
	};
}

export function createSessionAnswer(overrides: Partial<SessionAnswer> = {}): SessionAnswer {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		sessionQuestionId: '11111111-1111-4111-8111-111111111111',
		userId: '11111111-1111-4111-8111-111111111111',
		selectedAnswer: '4',
		isCorrect: true,
		timeSpentSeconds: 5,
		scoreEarned: 150,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		...overrides
	};
}

export function createQuestionRule(overrides: Partial<QuestionRule> = {}): QuestionRule {
	const now = new Date('2026-01-01T00:00:00.000Z');
	return {
		id: '11111111-1111-4111-8111-111111111111',
		categoryId: '11111111-1111-4111-8111-111111111111',
		ruleType: 'arithmetic_sequence',
		difficultyMin: 100,
		difficultyMax: 200,
		difficultyBand: null,
		timeLimitSeconds: 20,
		config: {},
		isActive: true,
		createdAt: now,
		updatedAt: now,
		...overrides
	};
}

export function createSessionRepositoryFake(
	input: {
		session?: ChallengeSession;
		categories?: Category[];
		rules?: QuestionRule[];
		config?: ChallengeConfig | null;
		questions?: SessionQuestion[];
		answers?: SessionAnswer[];
	} = {}
): SessionRepository & {
	createdSessions: NewChallengeSession[];
	completedSessions: CompleteSessionAndProfileInput[];
} {
	let session = input.session ?? createChallengeSession();
	const questions = [...(input.questions ?? [])];
	const answers = [...(input.answers ?? [])];
	const createdSessions: NewChallengeSession[] = [];
	const completedSessions: CompleteSessionAndProfileInput[] = [];

	return {
		createdSessions,
		completedSessions,
		async createSession(newSession) {
			createdSessions.push(newSession);
			session = createChallengeSession(newSession);
			return session;
		},
		async addQuestions(newQuestions: NewSessionQuestion[]) {
			const created = newQuestions.map((question, index) =>
				createSessionQuestion({
					id: `99999999-9999-4999-8999-${String(index).padStart(12, '0')}`,
					...question
				})
			);
			questions.push(...created);
			return created;
		},
		async addAnswer(newAnswer: NewSessionAnswer) {
			const answer = createSessionAnswer(newAnswer);
			answers.push(answer);
			return answer;
		},
		async listActiveCategories() {
			return input.categories ?? [];
		},
		async listActiveQuestionRules() {
			return input.rules ?? [];
		},
		async findActiveConfig() {
			return input.config ?? null;
		},
		async findSessionById(sessionId: string) {
			return session.id === sessionId ? session : null;
		},
		async findOwnedSession(sessionId: string, userId: string) {
			return session.id === sessionId && session.userId === userId ? session : null;
		},
		async listSessionQuestions(sessionId: string) {
			return questions.filter((question) => question.sessionId === sessionId);
		},
		async listSessionAnswers(_sessionId: string, userId: string) {
			return answers.filter((answer) => answer.userId === userId);
		},
		async findQuestionById(questionId: string) {
			return questions.find((question) => question.id === questionId) ?? null;
		},
		async findAnswerForQuestion(questionId: string, userId: string) {
			return (
				answers.find(
					(answer) => answer.sessionQuestionId === questionId && answer.userId === userId
				) ?? null
			);
		},
		async listHistory() {
			return { items: [], total: 0 };
		},
		async getDashboardStats(): Promise<DashboardSessionStats> {
			return {
				totalCompleted: 0,
				bestScore: 0,
				averageAccuracy: 0,
				averageSolveTimeSeconds: 0,
				recentSessions: []
			};
		},
		async markCompleted(input: CompleteSessionInput) {
			session = createChallengeSession({ ...session, ...input, status: 'completed' });
			return session;
		},
		async completeSessionAndUpdateProfile(input: CompleteSessionAndProfileInput) {
			completedSessions.push(input);
			session = createChallengeSession({
				...session,
				...input,
				status: input.isSuspicious ? 'suspicious' : 'completed'
			});
			return session;
		}
	};
}
