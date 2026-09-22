import type { RequestEvent } from '@sveltejs/kit';
import { clearGuestTokenCookie, getGuestToken } from '$lib/server/sessions/guest-token';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import { provisionProfile } from '$lib/server/auth/profile-provisioning';
import type { User } from '@supabase/supabase-js';

export async function tryClaimGuestSessionOnAuth(
	event: RequestEvent,
	user: User,
	preferredSessionId?: string | null,
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository()
): Promise<string | null> {
	try {
		const guestToken = getGuestToken(event);
		if (!guestToken) return null;

		const profile = await provisionProfile({ user, repository: profileRepository });

		let targetSessionId = preferredSessionId ?? null;
		if (!targetSessionId) {
			const latestGuestSession = await sessionRepository.findLatestGuestSession(guestToken);
			if (latestGuestSession && latestGuestSession.status === 'completed') {
				targetSessionId = latestGuestSession.id;
			}
		}

		if (!targetSessionId) return null;

		await sessionRepository.claimGuestSession({
			sessionId: targetSessionId,
			guestToken,
			userId: profile.id
		});

		clearGuestTokenCookie(event);
		return targetSessionId;
	} catch {
		return null;
	}
}
