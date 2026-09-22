import type { RequestEvent } from '@sveltejs/kit';
import { requireProfile } from '$lib/server/auth/guards';
import { badRequest } from '$lib/server/errors';
import { clearGuestTokenCookie, getGuestToken } from '$lib/server/sessions/guest-token';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import type { ChallengeSession } from '$lib/server/db/schema';

export type ClaimGuestInput = {
	sessionId: string;
	guestToken?: string;
};

export type ClaimGuestResult = {
	success: boolean;
	sessionId: string;
	rating: number;
	rank: ChallengeSession['rankAfter'];
	alreadyClaimed: boolean;
};

export type ClaimGuestService = {
	claim(event: RequestEvent, input: ClaimGuestInput): Promise<ClaimGuestResult>;
};

export function createClaimGuestService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository()
): ClaimGuestService {
	return {
		async claim(event, input) {
			if (!input.sessionId) {
				throw badRequest('sessionId is required');
			}

			const profile = await requireProfile(event, profileRepository);
			const guestToken = input.guestToken || getGuestToken(event);

			if (!guestToken) {
				throw badRequest('Guest token is required to claim session');
			}

			const result = await sessionRepository.claimGuestSession({
				sessionId: input.sessionId,
				guestToken,
				userId: profile.id
			});

			clearGuestTokenCookie(event);

			return {
				success: true,
				sessionId: result.session.id,
				rating: result.profileRating,
				rank: result.profileRank,
				alreadyClaimed: result.alreadyClaimed ?? false
			};
		}
	};
}
