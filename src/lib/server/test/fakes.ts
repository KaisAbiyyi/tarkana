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

export function createFakeEvent(
	user: User | null,
	initialCookies: Record<string, string> = {}
): RequestEvent {
	const cookieJar = new Map<string, string>(Object.entries(initialCookies));
	return {
		locals: {
			getUser: async () => user,
			getSession: async () => null,
			profile: null
		},
		url: new URL('http://localhost:5173/'),
		cookies: {
			get: (name: string) => cookieJar.get(name),
			set: (name: string, value: string) => {
				cookieJar.set(name, value);
			},
			delete: (name: string) => {
				cookieJar.delete(name);
			},
			getAll: () => Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value }))
		}
	} as unknown as RequestEvent;
}

export function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
	const now = new Date('2026-01-01T00:00:00.000Z');

	return {
		id: '11111111-1111-4111-8111-111111111111',
		name: 'John Doe',
		displayName: 'johndoe',
		avatarUrl: null,

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
		async findById(id?: string) {
			if (!profile) return null;
			if (id && profile.id !== id) {
				const created = createdProfiles.find((p) => p.id === id);
				return created ?? null;
			}
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

export function createShareRepositoryFake(
	initialShares: import('$lib/server/db/schema').SharedResult[] = []
): import('$lib/server/db/repositories/share-repository').ShareRepository & {
	shares: import('$lib/server/db/schema').SharedResult[];
} {
	const shares = [...initialShares];
	return {
		shares,
		async createShare(input) {
			const created: import('$lib/server/db/schema').SharedResult = {
				id: `shr-db-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				publicId: input.publicId,
				sessionId: input.sessionId,
				userId: input.userId,
				isRevoked: false,
				revokedAt: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			shares.push(created);
			return created;
		},
		async findShareByPublicId(publicId) {
			return shares.find((s) => s.publicId === publicId) ?? null;
		},
		async findActiveShareBySessionId(sessionId) {
			return shares.filter((s) => s.sessionId === sessionId && !s.isRevoked).pop() ?? null;
		},
		async revokeShare(publicId) {
			const share = shares.find((s) => s.publicId === publicId);
			if (share) {
				share.isRevoked = true;
				share.revokedAt = new Date();
				share.updatedAt = new Date();
			}
			return share ?? null;
		}
	};
}
