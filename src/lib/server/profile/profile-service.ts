import type { RequestEvent } from '@sveltejs/kit';
import { parseDisplayName } from '$lib/shared/validation/common';
import { requireProfile } from '$lib/server/auth/guards';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import type { ProfileSummary } from '$lib/shared/types/auth';

export type ProfileService = {
	getProfile(event: RequestEvent): Promise<ProfileSummary>;
	updateDisplayName(event: RequestEvent, input: unknown): Promise<ProfileSummary>;
};

export function createProfileService(
	profileRepository: ProfileRepository = createProfileRepository()
): ProfileService {
	return {
		async getProfile(event) {
			return requireProfile(event, profileRepository);
		},

		async updateDisplayName(event, input) {
			const profile = await requireProfile(event, profileRepository);
			const displayName = parseDisplayName(input);
			const updatedProfile = await profileRepository.updateDisplayName(profile.id, displayName);

			return {
				id: updatedProfile.id,
				displayName: updatedProfile.displayName,

				role: updatedProfile.role,
				rating: updatedProfile.rating,
				rank: updatedProfile.rank
			};
		}
	};
}
