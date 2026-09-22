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

		const result = await sessionRepository.claimAllGuestSessions({
			guestToken,
			userId: profile.id,
			specificSessionId: preferredSessionId ?? undefined
		});

		clearGuestTokenCookie(event);
		return result.primarySession?.id ?? preferredSessionId ?? null;
	} catch {
		return null;
	}
}
