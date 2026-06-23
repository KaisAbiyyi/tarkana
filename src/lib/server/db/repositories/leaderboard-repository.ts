import { count, desc, sql } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import { challengeSessions, usersProfile } from '$lib/server/db/schema';

export type LeaderboardRepository = {
	list(input: { limit: number; offset: number }): Promise<LeaderboardRow[]>;
	getUserPosition(userId: string): Promise<(LeaderboardRow & { position: number }) | null>;
};

export type LeaderboardRow = {
	userId: string;
	displayName: string;
	publicDiscriminator: string;
	rank: string;
	rating: number;
	averageAccuracy: number;
	totalCompleted: number;
};

export function createLeaderboardRepository(database: Database = getDb()): LeaderboardRepository {
	return {
		async list({ limit, offset }) {
			return database
				.select({
					userId: usersProfile.id,
					displayName: usersProfile.displayName,
					publicDiscriminator: usersProfile.publicDiscriminator,
					rank: usersProfile.rank,
					rating: usersProfile.rating,
					averageAccuracy: sql<number>`coalesce(avg(${challengeSessions.accuracy}), 0)`,
					totalCompleted: count(challengeSessions.id)
				})
				.from(usersProfile)
				.leftJoin(
					challengeSessions,
					sql`${challengeSessions.userId} = ${usersProfile.id}
						and ${challengeSessions.status} = 'completed'
						and ${challengeSessions.isSuspicious} = false`
				)
				.groupBy(usersProfile.id)
				.orderBy(desc(usersProfile.rating), desc(sql<number>`count(${challengeSessions.id})`))
				.limit(limit)
				.offset(offset);
		},

		async getUserPosition(userId) {
			const result = await database.execute(sql`
				WITH ranked_users AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						u.public_discriminator as "publicDiscriminator",
						u.rank,
						u.rating,
						coalesce(avg(cs.accuracy), 0) as "averageAccuracy",
						count(cs.id) as "totalCompleted",
						rank() OVER (
							ORDER BY u.rating DESC, count(cs.id) DESC
						) as position
					FROM users_profile u
					LEFT JOIN challenge_sessions cs ON cs.user_id = u.id AND cs.status = 'completed' AND cs.is_suspicious = false
					GROUP BY u.id, u.display_name, u.public_discriminator, u.rank, u.rating
				)
				SELECT * FROM ranked_users WHERE "userId" = ${userId}
			`);

			if (!result || result.length === 0) return null;

			const row = result[0] as Record<string, unknown>;
			return {
				userId: String(row.userId),
				displayName: String(row.displayName),
				publicDiscriminator: String(row.publicDiscriminator),
				rank: String(row.rank),
				rating: Number(row.rating),
				averageAccuracy: Number(row.averageAccuracy),
				totalCompleted: Number(row.totalCompleted),
				position: Number(row.position)
			};
		}
	};
}
