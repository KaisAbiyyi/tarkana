import type { RequestEvent } from '@sveltejs/kit';
import { requireProfile } from '$lib/server/auth/guards';
import { badRequest } from '$lib/server/errors';
import {
	clearGuestTokenCookie,
	getGuestToken,
	hashGuestToken
} from '$lib/server/sessions/guest-token';
import { logger } from '$lib/server/observability/logger';
import { getAnalyticsService } from '$lib/server/analytics/analytics-service';
import { getOrSetDistinctId } from '$lib/server/analytics/distinct-id';
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
	sessionId?: string;
};

export type ClaimGuestResult = {
	success: boolean;
	claimedCount: number;
	sessionId: string | null;
	rating: number;
	rank: ChallengeSession['rankAfter'];
	isProvisional: boolean;
	alreadyClaimed: boolean;
};

export type ClaimGuestService = {
	claim(event: RequestEvent, input?: ClaimGuestInput): Promise<ClaimGuestResult>;
};

export function createClaimGuestService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository()
): ClaimGuestService {
	return {
		async claim(event, input = {}) {
			const profile = await requireProfile(event, profileRepository);
			const guestToken = getGuestToken(event);

			if (!guestToken) {
				logger.warn('Guest claim failed: missing guest token cookie', {
					context: {
						action: 'guest_claim_failed',
						userId: profile.id,
						reason: 'Guest token cookie is required to claim session'
					}
				});
				throw badRequest('Guest token cookie is required to claim session');
			}

			try {
				const result = await sessionRepository.claimAllGuestSessions({
					guestToken,
					userId: profile.id,
					specificSessionId: input.sessionId
				});

				clearGuestTokenCookie(event);

				if (result.alreadyClaimed) {
					logger.info('Guest claim already claimed idempotently', {
						context: {
							action: 'guest_claim_success',
							userId: profile.id,
							guestTokenHash: hashGuestToken(guestToken),
							alreadyClaimed: true
						}
					});
				} else {
					logger.info('Guest claim succeeded', {
						context: {
							action: 'guest_claim_success',
							userId: profile.id,
							guestTokenHash: hashGuestToken(guestToken),
							claimedSessionsCount: result.claimedSessions.length,
							sessionIds: result.claimedSessions.map((s) => s.id),
							isProvisional: result.isProvisional,
							ratingAfter: result.profileRating,
							rankAfter: result.profileRank
						}
					});
				}

				if (!result.alreadyClaimed) {
					try {
						const distinctId = getOrSetDistinctId(event);
						await getAnalyticsService().identify(distinctId, profile.id);
						await getAnalyticsService().track({
							distinctId,
							userId: profile.id,
							event: 'guest_claim_succeeded',
							properties: {
								user_id: profile.id,
								claimed_count: result.claimedSessions.length,
								is_provisional: result.isProvisional,
								rating_after: result.profileRating
							}
						});
					} catch {
						/* ignore */
					}
				}

				return {
					success: true,
					claimedCount: result.claimedSessions.length,
					sessionId: result.primarySession?.id ?? null,
					rating: result.profileRating,
					rank: result.profileRank,
					isProvisional: result.isProvisional,
					alreadyClaimed: result.alreadyClaimed ?? false
				};
			} catch (caught) {
				const err = caught as Error;
				if (err.message.includes('already been claimed')) {
					logger.warn('Guest claim conflict: session claimed by another account', {
						context: {
							action: 'guest_claim_conflict',
							userId: profile.id,
							guestTokenHash: hashGuestToken(guestToken),
							sessionId: input.sessionId,
							reason: err.message
						}
					});
				} else {
					logger.warn('Guest claim failed', {
						context: {
							action: 'guest_claim_failed',
							userId: profile.id,
							guestTokenHash: hashGuestToken(guestToken),
							sessionId: input.sessionId,
							reason: err.message
						}
					});
				}
				throw badRequest(err.message);
			}
		}
	};
}
