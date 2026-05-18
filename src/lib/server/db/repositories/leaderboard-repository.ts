import { count, desc, sql } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import { challengeSessions, usersProfile } from '$lib/server/db/schema';

export type LeaderboardRepository = {
	list(input: { limit: number; offset: number }): Promise<LeaderboardRow[]>;
};

export type LeaderboardRow = {
	userId: string;
	displayName: string;
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
		}
	};
}
