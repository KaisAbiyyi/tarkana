import { and, count, desc, eq, max, sql } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import {
	challengeSessions,
	sessionAnswers,
	sessionQuestions,
	type ChallengeSession,
	type NewChallengeSession,
	type NewSessionAnswer,
	type NewSessionQuestion,
	type SessionAnswer,
	type SessionQuestion
} from '$lib/server/db/schema';

export type SessionRepository = {
	createSession(session: NewChallengeSession): Promise<ChallengeSession>;
	addQuestions(questions: NewSessionQuestion[]): Promise<SessionQuestion[]>;
	addAnswer(answer: NewSessionAnswer): Promise<SessionAnswer>;
	findSessionById(sessionId: string): Promise<ChallengeSession | null>;
	findOwnedSession(sessionId: string, userId: string): Promise<ChallengeSession | null>;
	listHistory(input: ListHistoryInput): Promise<{ items: ChallengeSession[]; total: number }>;
	getDashboardStats(userId: string): Promise<DashboardSessionStats>;
	markCompleted(input: CompleteSessionInput): Promise<ChallengeSession>;
};

export type ListHistoryInput = {
	userId: string;
	limit: number;
	offset: number;
};

export type DashboardSessionStats = {
	totalCompleted: number;
	bestScore: number;
	averageAccuracy: number;
	averageSolveTimeSeconds: number;
	recentSessions: ChallengeSession[];
};

export type CompleteSessionInput = {
	sessionId: string;
	totalScore: number;
	accuracy: number;
	totalTimeSeconds: number;
	averageTimeSeconds: number;
	ratingAfter: number;
	ratingDelta: number;
	rankAfter: ChallengeSession['rankAfter'];
	isSuspicious: boolean;
	suspiciousReason?: string | null;
};

export function createSessionRepository(database: Database = getDb()): SessionRepository {
	return {
		async createSession(session) {
			const [createdSession] = await database.insert(challengeSessions).values(session).returning();
			if (!createdSession) throw new Error('Could not create session');
			return createdSession;
		},

		async addQuestions(questions) {
			if (questions.length === 0) return [];
			return database.insert(sessionQuestions).values(questions).returning();
		},

		async addAnswer(answer) {
			const [createdAnswer] = await database.insert(sessionAnswers).values(answer).returning();
			if (!createdAnswer) throw new Error('Could not create answer');
			return createdAnswer;
		},

		async findSessionById(sessionId) {
			const [session] = await database
				.select()
				.from(challengeSessions)
				.where(eq(challengeSessions.id, sessionId))
				.limit(1);

			return session ?? null;
		},

		async findOwnedSession(sessionId, userId) {
			const [session] = await database
				.select()
				.from(challengeSessions)
				.where(and(eq(challengeSessions.id, sessionId), eq(challengeSessions.userId, userId)))
				.limit(1);

			return session ?? null;
		},

		async listHistory({ userId, limit, offset }) {
			const items = await database
				.select()
				.from(challengeSessions)
				.where(eq(challengeSessions.userId, userId))
				.orderBy(desc(challengeSessions.createdAt))
				.limit(limit)
				.offset(offset);

			const [totalRow] = await database
				.select({ value: count() })
				.from(challengeSessions)
				.where(eq(challengeSessions.userId, userId));

			return { items, total: totalRow?.value ?? 0 };
		},

		async getDashboardStats(userId) {
			const [aggregate] = await database
				.select({
					totalCompleted: count(),
					bestScore: max(challengeSessions.totalScore),
					averageAccuracy: sql<number>`coalesce(avg(${challengeSessions.accuracy}), 0)`,
					averageSolveTimeSeconds: sql<number>`coalesce(avg(${challengeSessions.averageTimeSeconds}), 0)`
				})
				.from(challengeSessions)
				.where(
					and(
						eq(challengeSessions.userId, userId),
						eq(challengeSessions.status, 'completed'),
						eq(challengeSessions.isSuspicious, false)
					)
				);

			const recentSessions = await database
				.select()
				.from(challengeSessions)
				.where(eq(challengeSessions.userId, userId))
				.orderBy(desc(challengeSessions.createdAt))
				.limit(5);

			return {
				totalCompleted: aggregate?.totalCompleted ?? 0,
				bestScore: aggregate?.bestScore ?? 0,
				averageAccuracy: Number(aggregate?.averageAccuracy ?? 0),
				averageSolveTimeSeconds: Number(aggregate?.averageSolveTimeSeconds ?? 0),
				recentSessions
			};
		},

		async markCompleted(input) {
			const [updatedSession] = await database
				.update(challengeSessions)
				.set({
					status: input.isSuspicious ? 'suspicious' : 'completed',
					totalScore: input.totalScore,
					accuracy: input.accuracy,
					totalTimeSeconds: input.totalTimeSeconds,
					averageTimeSeconds: input.averageTimeSeconds,
					ratingAfter: input.ratingAfter,
					ratingDelta: input.ratingDelta,
					rankAfter: input.rankAfter,
					isSuspicious: input.isSuspicious,
					suspiciousReason: input.suspiciousReason ?? null,
					completedAt: new Date()
				})
				.where(eq(challengeSessions.id, input.sessionId))
				.returning();

			if (!updatedSession) throw new Error('Could not complete session');
			return updatedSession;
		}
	};
}
