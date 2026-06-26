import type { User } from '@supabase/supabase-js';
import { DEFAULT_USER_ROLE } from '$lib/shared/constants/auth';
import { UNRANKED } from '$lib/shared/constants/rank';
import type { ProfileSummary } from '$lib/shared/types/auth';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';

export type ProvisionProfileInput = {
	user: Pick<User, 'id' | 'email' | 'user_metadata'>;
	repository?: ProfileRepository;
};

export async function provisionProfile({
	user,
	repository = createProfileRepository()
}: ProvisionProfileInput): Promise<ProfileSummary> {
	const existingProfile = await repository.findById(user.id);
	if (existingProfile) return toProfileSummary(existingProfile);

	const displayName = buildDefaultDisplayName(user);
	const createdProfile = await repository.create({
		id: user.id,
		name: displayName,
		displayName,

		role: DEFAULT_USER_ROLE,
		rating: 0,
		rank: UNRANKED
	});

	return toProfileSummary(createdProfile);
}

export function buildDefaultDisplayName(
	user: Pick<User, 'email' | 'user_metadata'>,
	fallback = 'Tarkana Player'
): string {
	const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
	const rawName = typeof metadataName === 'string' ? metadataName : user.email?.split('@')[0];
	const cleanedName = sanitizeDisplayName(rawName ?? fallback);

	return cleanedName || fallback;
}

export function sanitizeDisplayName(value: string): string {
	const sanitized = value
		.trim()
		.replace(/[^a-zA-Z0-9 _.-]/g, '')
		.replace(/\s+/g, ' ')
		.slice(0, 32);

	if (sanitized.length >= 2) return sanitized;
	return 'Tarkana Player';
}

function toProfileSummary(profile: {
	id: string;
	displayName: string;

	role: ProfileSummary['role'];
	rating: number;
	rank: ProfileSummary['rank'];
}): ProfileSummary {
	return {
		id: profile.id,
		displayName: profile.displayName,

		role: profile.role,
		rating: profile.rating,
		rank: profile.rank
	};
}
