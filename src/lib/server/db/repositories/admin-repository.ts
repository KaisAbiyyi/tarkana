import { count, desc, eq } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import {
	categories,
	challengeConfigs,
	challengeSessions,
	questionRules,
	usersProfile,
	type Category,
	type ChallengeSession,
	type ChallengeConfig,
	type NewCategory,
	type NewChallengeConfig,
	type NewQuestionRule,
	type QuestionRule
} from '$lib/server/db/schema';

export type AdminRepository = {
	listCategories(input: PageInput): Promise<Category[]>;
	upsertCategory(input: NewCategory): Promise<Category>;
	listQuestionRules(input: PageInput): Promise<QuestionRule[]>;
	upsertQuestionRule(input: NewQuestionRule): Promise<QuestionRule>;
	listChallengeConfigs(input: PageInput): Promise<ChallengeConfig[]>;
	upsertChallengeConfig(input: NewChallengeConfig): Promise<ChallengeConfig>;
	getOverview(): Promise<AdminOverview>;
	listSessions(input: PageInput): Promise<AdminSessionRow[]>;
};

export type PageInput = {
	limit: number;
	offset: number;
};

export type AdminOverview = {
	categoryCount: number;
	activeRuleCount: number;
	challengeConfigCount: number;
	suspiciousSessionCount: number;
	userCount: number;
};

export type AdminSessionRow = {
	id: string;
	displayName: string;
	challengeType: ChallengeSession['challengeType'];
	status: ChallengeSession['status'];
	totalQuestions: number;
	totalScore: number;
	accuracy: number;
	isSuspicious: boolean;
	createdAt: Date;
};

export function createAdminRepository(database: Database = getDb()): AdminRepository {
	return {
		async listCategories({ limit, offset }) {
			return database
				.select()
				.from(categories)
				.orderBy(categories.slug)
				.limit(limit)
				.offset(offset);
		},

		async upsertCategory(input) {
			const [category] = input.id
				? await database
						.update(categories)
						.set(input)
						.where(eq(categories.id, input.id))
						.returning()
				: await database.insert(categories).values(input).returning();

			if (!category) throw new Error('Could not save category');
			return category;
		},

		async listQuestionRules({ limit, offset }) {
			return database
				.select()
				.from(questionRules)
				.orderBy(desc(questionRules.createdAt))
				.limit(limit)
				.offset(offset);
		},

		async upsertQuestionRule(input) {
			const [rule] = input.id
				? await database
						.update(questionRules)
						.set(input)
						.where(eq(questionRules.id, input.id))
						.returning()
				: await database.insert(questionRules).values(input).returning();

			if (!rule) throw new Error('Could not save question rule');
			return rule;
		},

		async listChallengeConfigs({ limit, offset }) {
			return database
				.select()
				.from(challengeConfigs)
				.orderBy(desc(challengeConfigs.createdAt))
				.limit(limit)
				.offset(offset);
		},

		async upsertChallengeConfig(input) {
			const [config] = input.id
				? await database
						.update(challengeConfigs)
						.set(input)
						.where(eq(challengeConfigs.id, input.id))
						.returning()
				: await database.insert(challengeConfigs).values(input).returning();

			if (!config) throw new Error('Could not save challenge config');
			return config;
		},

		async getOverview() {
			const [[categoryRow], [ruleRow], [configRow], [suspiciousRow], [userRow]] = await Promise.all(
				[
					database.select({ value: count() }).from(categories),
					database
						.select({ value: count() })
						.from(questionRules)
						.where(eq(questionRules.isActive, true)),
					database.select({ value: count() }).from(challengeConfigs),
					database
						.select({ value: count() })
						.from(challengeSessions)
						.where(eq(challengeSessions.isSuspicious, true)),
					database.select({ value: count() }).from(usersProfile)
				]
			);

			return {
				categoryCount: categoryRow?.value ?? 0,
				activeRuleCount: ruleRow?.value ?? 0,
				challengeConfigCount: configRow?.value ?? 0,
				suspiciousSessionCount: suspiciousRow?.value ?? 0,
				userCount: userRow?.value ?? 0
			};
		},

		async listSessions({ limit, offset }) {
			return database
				.select({
					id: challengeSessions.id,
					displayName: usersProfile.displayName,
					challengeType: challengeSessions.challengeType,
					status: challengeSessions.status,
					totalQuestions: challengeSessions.totalQuestions,
					totalScore: challengeSessions.totalScore,
					accuracy: challengeSessions.accuracy,
					isSuspicious: challengeSessions.isSuspicious,
					createdAt: challengeSessions.createdAt
				})
				.from(challengeSessions)
				.innerJoin(usersProfile, eq(challengeSessions.userId, usersProfile.id))
				.orderBy(desc(challengeSessions.createdAt))
				.limit(limit)
				.offset(offset);
		}
	};
}
