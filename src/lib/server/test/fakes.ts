import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
import type { ProfileSummary } from '$lib/shared/types/auth';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';
import type { UserProfile } from '$lib/server/db/schema';

export function createFakeUser(overrides: Partial<User> = {}): User {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		app_metadata: {},
		user_metadata: {},
		aud: 'authenticated',
		created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
		email: 'player@example.com',
		...overrides
	} as User;
}

export function createFakeEvent(user: User | null): RequestEvent {
	return {
		locals: {
			getUser: async () => user,
			getSession: async () => null,
			profile: null
		}
	} as RequestEvent;
}

export function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
	const now = new Date('2026-01-01T00:00:00.000Z');

	return {
		id: '11111111-1111-4111-8111-111111111111',
		name: 'Player',
		displayName: 'Player',
		role: 'user',
		rating: 0,
		rank: 'Unranked',
		createdAt: now,
		updatedAt: now,
		...overrides
	};
}

export function createProfileRepositoryFake(
	initialProfile: UserProfile | null = createProfile()
): ProfileRepository & { createdProfiles: UserProfile[]; updatedDisplayNames: string[] } {
	let profile = initialProfile;
	const createdProfiles: UserProfile[] = [];
	const updatedDisplayNames: string[] = [];

	return {
		createdProfiles,
		updatedDisplayNames,
		async findById() {
			return profile;
		},
		async create(input) {
			const created = createProfile(input);
			profile = created;
			createdProfiles.push(created);
			return created;
		},
		async updateDisplayName(_userId, displayName) {
			if (!profile) throw new Error('No profile');
			updatedDisplayNames.push(displayName);
			profile = { ...profile, displayName };
			return profile;
		},
		async updateRatingAndRank(input) {
			if (!profile) throw new Error('No profile');
			profile = { ...profile, rating: input.rating, rank: input.rank };
			return profile;
		}
	};
}

export function toProfileSummary(profile: UserProfile): ProfileSummary {
	return {
		id: profile.id,
		displayName: profile.displayName,
		role: profile.role,
		rating: profile.rating,
		rank: profile.rank
	};
}
