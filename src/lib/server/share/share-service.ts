import type { RequestEvent } from '@sveltejs/kit';
import { createHash, randomBytes } from 'node:crypto';
import { getOptionalProfile } from '$lib/server/auth/guards';
import { getGuestToken, hashGuestToken } from '$lib/server/sessions/guest-token';
import { badRequest, forbidden, notFound, unauthorized } from '$lib/server/errors';
import { requireUuid } from '$lib/shared/validation/common';
import type { ChallengeType } from '$lib/shared/constants/challenge';
import {
	createShareRepository,
	type ShareRepository
} from '$lib/server/db/repositories/share-repository';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import {
	createDailyRepository,
	type DailyRepository
} from '$lib/server/db/repositories/daily-repository';
import { getAnalyticsService } from '$lib/server/analytics/analytics-service';
import { getOrSetDistinctId } from '$lib/server/analytics/distinct-id';

export function toAnalyticsShareId(publicId: string): string {
	return createHash('sha256').update(publicId).digest('hex').slice(0, 16);
}

export interface PublicShareQuestionDto {
	orderIndex: number;
	isCorrect: boolean;
}

export interface PublicShareResultDto {
	publicId: string;
	displayName: string;
	challengeType: ChallengeType;
	challengeDate?: string;
	totalScore: number;
	accuracy: number;
	correctAnswers: number;
	totalQuestions: number;
	totalTimeSeconds: number;
	averageTimeSeconds: number;
	logicRank: string;
	completedAt: Date;
	questions: PublicShareQuestionDto[];
}

export interface CreateShareResult {
	publicId: string;
	shareUrl: string;
	analyticsShareId: string;
}

export interface ShareService {
	createShare(event: RequestEvent, input: { sessionId: string }): Promise<CreateShareResult>;
	getPublicShare(publicId: string): Promise<PublicShareResultDto>;
	revokeShare(event: RequestEvent, publicId: string): Promise<void>;
}

export function getAppOrigin(event?: RequestEvent): string {
	const configured = process.env.APP_ORIGIN || process.env.PUBLIC_APP_URL || process.env.ORIGIN;
	if (configured) {
		return configured.replace(/\/+$/, '');
	}
	if (event?.url?.origin) {
		return event.url.origin;
	}
	return 'http://localhost:5173';
}

export function createShareService(
	shareRepository: ShareRepository = createShareRepository(),
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository(),
	dailyRepository: DailyRepository = createDailyRepository()
): ShareService {
	return {
		async createShare(event, input) {
			const sessionId = requireUuid(input.sessionId, 'sessionId');
			const profile = await getOptionalProfile(event, profileRepository);

			let session;
			const isGuest = !profile;

			if (profile) {
				session = await sessionRepository.findOwnedSession(sessionId, profile.id);
			} else {
				const guestToken = getGuestToken(event);
				if (!guestToken) {
					throw unauthorized('Unauthorized or guest token missing');
				}
				session = await sessionRepository.findGuestSession(sessionId, guestToken);
			}

			if (!session) {
				throw notFound('Challenge session was not found');
			}

			if (session.status !== 'completed') {
				throw badRequest('Only completed challenges can be shared');
			}

			if (session.isSuspicious) {
				throw forbidden('Suspicious sessions cannot be shared');
			}

			const origin = getAppOrigin(event);

			// Idempotently return existing active share if already created
			const existing = await shareRepository.findActiveShareBySessionId(session.id);
			if (existing) {
				const analyticsShareId = toAnalyticsShareId(existing.publicId);
				return {
					publicId: existing.publicId,
					shareUrl: `${origin}/share/${existing.publicId}`,
					analyticsShareId
				};
			}

			let displayName = 'Guest Solver';
			if (profile?.displayName) {
				displayName = profile.displayName;
			}

			// Generate opaque URL-safe publicId
			const randomSlug = randomBytes(9).toString('base64url');
			const publicId = `shr_${randomSlug}`;

			const activeShare = await shareRepository.createShare({
				sessionId: session.id,
				userId: profile?.id ?? null,
				publicId,
				displayName
			});

			const canonicalPublicId = activeShare.publicId;
			const analyticsShareId = toAnalyticsShareId(canonicalPublicId);

			try {
				const distinctId = getOrSetDistinctId(event);
				getAnalyticsService().track({
					distinctId,
					userId: profile?.id ?? null,
					event: 'share_created',
					properties: {
						share_id: analyticsShareId,
						session_id: session.id,
						challenge_type: session.challengeType,
						is_guest: isGuest
					}
				});
			} catch {
				// non-blocking
			}

			return {
				publicId: canonicalPublicId,
				shareUrl: `${origin}/share/${canonicalPublicId}`,
				analyticsShareId
			};
		},

		async getPublicShare(publicId) {
			if (!publicId || typeof publicId !== 'string' || !/^[a-zA-Z0-9_-]{8,32}$/.test(publicId)) {
				throw badRequest('Invalid share ID');
			}

			const share = await shareRepository.findShareByPublicId(publicId);
			if (!share || share.isRevoked) {
				throw notFound('Shared result was not found or has been revoked');
			}

			const session = await sessionRepository.findSessionById(share.sessionId);
			if (!session || session.status !== 'completed' || session.isSuspicious) {
				throw notFound('Shared result was not found');
			}

			// Use snapshotted display name to preserve anonymous creator identity even after claim
			const displayName = share.displayName || 'Guest Solver';

			let challengeDate: string | undefined;
			if (session.challengeType === 'daily') {
				const attempt = await dailyRepository.findAttemptBySessionId(session.id);
				if (attempt) {
					const daily = await dailyRepository.findDailyChallengeById(attempt.dailyChallengeId);
					if (daily) {
						challengeDate = daily.challengeDate;
					}
				}
			}

			const [questions, answers] = await Promise.all([
				sessionRepository.listSessionQuestions(session.id),
				sessionRepository.listSessionAnswers(session.id, session.userId ?? undefined)
			]);

			const answerByQuestionId = new Map(answers.map((a) => [a.sessionQuestionId, a]));
			const sortedQuestions = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);

			const questionDtos: PublicShareQuestionDto[] = sortedQuestions.map((q) => {
				const ans = answerByQuestionId.get(q.id);
				return {
					orderIndex: q.orderIndex,
					isCorrect: ans?.isCorrect ?? false
				};
			});

			const correctAnswers = questionDtos.filter((q) => q.isCorrect).length;
			const totalQuestions = session.totalQuestions || questionDtos.length;

			return {
				publicId: share.publicId,
				displayName,
				challengeType: session.challengeType as ChallengeType,
				challengeDate,
				totalScore: session.totalScore,
				accuracy: session.accuracy,
				correctAnswers,
				totalQuestions,
				totalTimeSeconds: session.totalTimeSeconds,
				averageTimeSeconds: session.averageTimeSeconds,
				logicRank: session.rankAfter,
				completedAt: session.completedAt ?? session.updatedAt,
				questions: questionDtos
			};
		},

		async revokeShare(event, publicId) {
			if (!publicId || typeof publicId !== 'string' || !/^[a-zA-Z0-9_-]{8,32}$/.test(publicId)) {
				throw badRequest('Invalid share ID');
			}

			const profile = await getOptionalProfile(event, profileRepository);
			const guestToken = getGuestToken(event);

			const share = await shareRepository.findShareByPublicId(publicId);
			if (!share) throw notFound('Shared result was not found');

			const session = await sessionRepository.findSessionById(share.sessionId);
			if (!session) throw notFound('Session was not found');

			let isOwner = false;
			if (profile && session.userId === profile.id) {
				isOwner = true;
			} else if (guestToken && session.guestToken === hashGuestToken(guestToken)) {
				isOwner = true;
			}

			if (!isOwner) {
				throw forbidden('You are not authorized to revoke this share');
			}

			await shareRepository.revokeShare(publicId);
		}
	};
}
