import { eq } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import { usersProfile, type NewUserProfile, type UserProfile } from '$lib/server/db/schema';

export type ProfileRepository = {
	findById(userId: string): Promise<UserProfile | null>;
	create(profile: NewUserProfile): Promise<UserProfile>;
	updateDisplayName(userId: string, displayName: string): Promise<UserProfile>;
	updateRatingAndRank(input: UpdateRatingAndRankInput): Promise<UserProfile>;
};

export type UpdateRatingAndRankInput = {
	userId: string;
	rating: number;
	rank: UserProfile['rank'];
};

export function createProfileRepository(database: Database = getDb()): ProfileRepository {
	return {
		async findById(userId) {
			const [profile] = await database
				.select()
				.from(usersProfile)
				.where(eq(usersProfile.id, userId))
				.limit(1);

			return profile ?? null;
		},

		async create(profile) {
			const [createdProfile] = await database
				.insert(usersProfile)
				.values(profile)
				.onConflictDoNothing()
				.returning();

			if (!createdProfile) {
				const [existingProfile] = await database
					.select()
					.from(usersProfile)
					.where(eq(usersProfile.id, profile.id))
					.limit(1);

				if (!existingProfile) throw new Error('Could not create or find profile');
				return existingProfile;
			}

			return createdProfile;
		},

		async updateDisplayName(userId, displayName) {
			const [updatedProfile] = await database
				.update(usersProfile)
				.set({ displayName })
				.where(eq(usersProfile.id, userId))
				.returning();

			if (!updatedProfile) throw new Error('Could not update profile');
			return updatedProfile;
		},

		async updateRatingAndRank({ userId, rating, rank }) {
			const [updatedProfile] = await database
				.update(usersProfile)
				.set({ rating, rank })
				.where(eq(usersProfile.id, userId))
				.returning();

			if (!updatedProfile) throw new Error('Could not update profile rating');
			return updatedProfile;
		}
	};
}
