import type { RequestEvent } from '@sveltejs/kit';
import { getOptionalProfile } from '$lib/server/auth/guards';
import { getGuestToken } from '$lib/server/sessions/guest-token';
import { badRequest, notFound, unauthorized } from '$lib/server/errors';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';

export type AbandonChallengeInput = {
	sessionId: string;
};

export type AbandonChallengeResult = {
	success: boolean;
};

export type AbandonChallengeService = {
	abandon(event: RequestEvent, input: AbandonChallengeInput): Promise<AbandonChallengeResult>;
};

export function createAbandonChallengeService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository()
): AbandonChallengeService {
	return {
		async abandon(event, input) {
			if (!input.sessionId) {
				throw badRequest('sessionId is required');
			}

			const profile = await getOptionalProfile(event, profileRepository);

			let session;
			if (profile) {
				session = await sessionRepository.findOwnedSession(input.sessionId, profile.id);
			} else {
				const guestToken = getGuestToken(event);
				if (!guestToken) {
					throw unauthorized('Unauthorized or guest token missing');
				}
				session = await sessionRepository.findGuestSession(input.sessionId, guestToken);
			}

			if (!session) {
				throw notFound('Challenge session was not found');
			}

			if (session.status !== 'in_progress') {
				throw badRequest('Can only abandon in_progress sessions');
			}

			await sessionRepository.abandonSession(session.id);

			return { success: true };
		}
	};
}
