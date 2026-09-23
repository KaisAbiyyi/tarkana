import { describe, expect, it } from 'vitest';
import { createShareService, toAnalyticsShareId } from './share-service';
import {
	createChallengeSession,
	createSessionAnswer,
	createSessionQuestion,
	createSessionRepositoryFake
} from '$lib/server/sessions/test-fakes';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake,
	createShareRepositoryFake
} from '$lib/server/test/fakes';
import { GUEST_TOKEN_COOKIE, hashGuestToken } from '$lib/server/sessions/guest-token';
import type { DailyRepository } from '$lib/server/db/repositories/daily-repository';
import type { ChallengeSession } from '$lib/server/db/schema';

describe('ShareService', () => {
	function setup(
		overrides: {
			session?: ChallengeSession;
			dailyAttempt?: any;
			dailyChallenge?: any;
		} = {}
	) {
		const user = createFakeUser({ id: 'user-alice' });
		const profile = createProfile({ id: 'user-alice', displayName: 'AliceWonder' });
		const profileRepo = createProfileRepositoryFake(profile);
		const shareRepo = createShareRepositoryFake();

		const defaultSession = createChallengeSession({
			id: '12345678-1234-4234-8234-123456789abc',
			userId: 'user-alice',
			status: 'completed',
			totalScore: 850,
			totalQuestions: 2,
			accuracy: 90,
			totalTimeSeconds: 42,
			rankAfter: 'Silver Solver',
			isSuspicious: false
		});

		const session = overrides.session ?? defaultSession;
		const q1 = createSessionQuestion({
			sessionId: session.id,
			orderIndex: 0,
			prompt: 'Secret Logic Question 1',
			correctAnswer: 'Answer A',
			explanation: 'Secret Explanation'
		});
		const q2 = createSessionQuestion({
			id: '22222222-2222-4222-8222-222222222222',
			sessionId: session.id,
			orderIndex: 1,
			prompt: 'Secret Logic Question 2',
			correctAnswer: 'Answer B',
			explanation: 'Secret Explanation 2'
		});

		const a1 = createSessionAnswer({
			sessionQuestionId: q1.id,
			userId: session.userId,
			isCorrect: true,
			scoreEarned: 100
		});
		const a2 = createSessionAnswer({
			id: '33333333-3333-4333-8333-333333333333',
			sessionQuestionId: q2.id,
			userId: session.userId,
			isCorrect: false,
			scoreEarned: 0
		});

		const sessionRepo = createSessionRepositoryFake({
			session,
			questions: [q1, q2],
			answers: [a1, a2]
		});

		const dailyRepo: DailyRepository = {
			findDailyChallengeByDate: async () => null,
			findDailyChallengeById: async (id) =>
				overrides.dailyChallenge ?? {
					id,
					challengeDate: '2026-09-23',
					configVersion: 1,
					generatorVersion: 1,
					seed: 'seed123',
					totalQuestions: 10,
					puzzleSnapshot: [],
					createdAt: new Date()
				},
			getOrCreateDailyChallenge: async (c) => c as any,
			findAttemptForUser: async () => null,
			findAttemptForGuest: async () => null,
			createAttempt: async (a) => a as any,
			findAttemptBySessionId: async () =>
				overrides.dailyAttempt ?? {
					id: 'att-123',
					dailyChallengeId: 'daily-challenge-123',
					sessionId: session.id,
					status: 'completed',
					isOfficial: true
				},
			completeAttempt: async (a) => a as any,
			abandonAttempt: async () => {},
			claimGuestDailyAttempts: async () => ({ claimedCount: 0, demotedCount: 0 }),
			startDailySessionAtomic: async () => ({ type: 'conflict_completed' }),
			getDailyLeaderboard: async () => ({ date: '2026-09-23', totalParticipants: 0, items: [] }),
			getUserDailyPosition: async () => null,
			getAroundMeDailyLeaderboard: async () => [],
			getGuestHypotheticalPosition: async () => null
		};

		const service = createShareService(shareRepo, sessionRepo, profileRepo, dailyRepo);

		return { user, profile, shareRepo, sessionRepo, profileRepo, dailyRepo, service, session };
	}

	describe('createShare', () => {
		it('allows authenticated owner to create a share link with opaque publicId', async () => {
			const { user, service, session, shareRepo } = setup();
			const event = createFakeEvent(user);

			const result = await service.createShare(event, { sessionId: session.id });

			expect(result.publicId).toMatch(/^shr_[a-zA-Z0-9_-]{12}$/);
			expect(result.shareUrl).toContain(`/share/${result.publicId}`);
			expect(result.analyticsShareId).toBe(toAnalyticsShareId(result.publicId));
			expect(result.analyticsShareId).not.toBe(result.publicId);

			const stored = await shareRepo.findShareByPublicId(result.publicId);
			expect(stored).not.toBeNull();
			expect(stored?.sessionId).toBe(session.id);
			expect(stored?.userId).toBe('user-alice');
			expect(stored?.isRevoked).toBe(false);
		});

		it('allows guest owner with valid HttpOnly cookie to create a share link', async () => {
			const rawGuestToken = 'guest-secret-token-xyz';
			const guestSession = createChallengeSession({
				id: '99999999-9999-4999-8999-999999999999',
				userId: null,
				guestToken: hashGuestToken(rawGuestToken),
				status: 'completed',
				totalScore: 700,
				accuracy: 80,
				isSuspicious: false
			});

			const { service } = setup({ session: guestSession });
			const event = createFakeEvent(null, { [GUEST_TOKEN_COOKIE]: rawGuestToken });

			const result = await service.createShare(event, { sessionId: guestSession.id });

			expect(result.publicId).toMatch(/^shr_/);
			expect(result.shareUrl).toContain(`/share/${result.publicId}`);
		});

		it('rejects guest share creation when guest cookie is missing', async () => {
			const guestSession = createChallengeSession({
				userId: null,
				guestToken: hashGuestToken('some-token'),
				status: 'completed'
			});
			const { service } = setup({ session: guestSession });
			const event = createFakeEvent(null); // No cookie!

			await expect(service.createShare(event, { sessionId: guestSession.id })).rejects.toThrow(
				/Unauthorized or guest token missing/i
			);
		});

		it('rejects unauthorized caller trying to share another user session', async () => {
			const { service, session } = setup();
			const eve = createFakeUser({ id: 'user-eve' });
			const event = createFakeEvent(eve);

			await expect(service.createShare(event, { sessionId: session.id })).rejects.toThrow(
				/was not found/i
			);
		});

		it('rejects sharing an in-progress session', async () => {
			const inProgressSession = createChallengeSession({
				userId: 'user-alice',
				status: 'in_progress'
			});
			const { user, service } = setup({ session: inProgressSession });
			const event = createFakeEvent(user);

			await expect(service.createShare(event, { sessionId: inProgressSession.id })).rejects.toThrow(
				/Only completed challenges can be shared/i
			);
		});

		it('rejects sharing an abandoned session', async () => {
			const abandonedSession = createChallengeSession({
				userId: 'user-alice',
				status: 'abandoned'
			});
			const { user, service } = setup({ session: abandonedSession });
			const event = createFakeEvent(user);

			await expect(service.createShare(event, { sessionId: abandonedSession.id })).rejects.toThrow(
				/Only completed challenges can be shared/i
			);
		});

		it('rejects sharing a suspicious session', async () => {
			const suspiciousSession = createChallengeSession({
				userId: 'user-alice',
				status: 'completed',
				isSuspicious: true
			});
			const { user, service } = setup({ session: suspiciousSession });
			const event = createFakeEvent(user);

			await expect(service.createShare(event, { sessionId: suspiciousSession.id })).rejects.toThrow(
				/Suspicious sessions cannot be shared/i
			);
		});

		it('is idempotent: returns existing active publicId without creating duplicates', async () => {
			const { user, service, session, shareRepo } = setup();
			const event = createFakeEvent(user);

			const first = await service.createShare(event, { sessionId: session.id });
			const second = await service.createShare(event, { sessionId: session.id });

			expect(first.publicId).toBe(second.publicId);
			expect(shareRepo.shares.filter((s) => s.sessionId === session.id)).toHaveLength(1);
		});

		it('handles concurrent createShare calls safely returning the same canonical share', async () => {
			const { user, service, session, shareRepo } = setup();
			const event = createFakeEvent(user);

			const [resultA, resultB] = await Promise.all([
				service.createShare(event, { sessionId: session.id }),
				service.createShare(event, { sessionId: session.id })
			]);

			expect(resultA.publicId).toBe(resultB.publicId);
			expect(resultA.shareUrl).toBe(resultB.shareUrl);
			expect(resultA.analyticsShareId).toBe(resultB.analyticsShareId);
			expect(shareRepo.shares.filter((s) => s.sessionId === session.id)).toHaveLength(1);
		});
	});

	describe('getPublicShare', () => {
		it('returns sanitized zero-PII DTO for public consumption', async () => {
			const { user, service, session } = setup();
			const event = createFakeEvent(user);
			const { publicId } = await service.createShare(event, { sessionId: session.id });

			const publicDto = await service.getPublicShare(publicId);

			expect(publicDto.publicId).toBe(publicId);
			expect(publicDto.displayName).toBe('AliceWonder');
			expect(publicDto.totalScore).toBe(850);
			expect(publicDto.accuracy).toBe(90);
			expect(publicDto.logicRank).toBe('Silver Solver');
			expect(publicDto.totalQuestions).toBe(2);
			expect(publicDto.correctAnswers).toBe(1);

			// Assert ZERO PII: no internal IDs or tokens anywhere in returned DTO
			expect(publicDto).not.toHaveProperty('sessionId');
			expect(publicDto).not.toHaveProperty('userId');
			expect(publicDto).not.toHaveProperty('email');
			expect(publicDto).not.toHaveProperty('guestToken');
			expect(publicDto).not.toHaveProperty('distinctId');
			expect(publicDto).not.toHaveProperty('isSuspicious');
		});

		it('snapshots creator display name at creation and preserves it across claim or profile edits', async () => {
			const rawGuestToken = 'guest-secret-token-snap';
			const guestSession = createChallengeSession({
				id: '88888888-8888-4888-8888-888888888888',
				userId: null,
				guestToken: hashGuestToken(rawGuestToken),
				status: 'completed',
				totalScore: 720,
				accuracy: 80,
				isSuspicious: false
			});
			const { service, profileRepo } = setup({ session: guestSession });
			const event = createFakeEvent(null, { [GUEST_TOKEN_COOKIE]: rawGuestToken });

			const { publicId } = await service.createShare(event, { sessionId: guestSession.id });
			let publicDto = await service.getPublicShare(publicId);
			expect(publicDto.displayName).toBe('Guest Solver');

			// Now simulate guest session being claimed by a registered user "Bob"
			guestSession.userId = 'user-bob';
			await profileRepo.create({ id: 'user-bob', displayName: 'BobTheBuilder' });

			// getPublicShare MUST still return the snapshotted 'Guest Solver', not 'BobTheBuilder'
			publicDto = await service.getPublicShare(publicId);
			expect(publicDto.displayName).toBe('Guest Solver');
		});

		it('preserves non-standard challenge types in public share DTO', async () => {
			const quickSession = createChallengeSession({
				userId: 'user-alice',
				challengeType: 'quick',
				status: 'completed',
				accuracy: 85
			});
			const { user, service } = setup({ session: quickSession });
			const event = createFakeEvent(user);
			const { publicId } = await service.createShare(event, { sessionId: quickSession.id });

			const publicDto = await service.getPublicShare(publicId);
			expect(publicDto.challengeType).toBe('quick');
		});

		it('enforces permanent anti-spoiler protection on question breakdown', async () => {
			const dailySession = createChallengeSession({
				userId: 'user-alice',
				challengeType: 'daily',
				status: 'completed'
			});
			const { user, service } = setup({ session: dailySession });
			const event = createFakeEvent(user);
			const { publicId } = await service.createShare(event, { sessionId: dailySession.id });

			const publicDto = await service.getPublicShare(publicId);

			expect(publicDto.challengeType).toBe('daily');
			expect(publicDto.challengeDate).toBe('2026-09-23');
			expect(publicDto.questions).toHaveLength(2);

			// Each question exposes ONLY orderIndex and isCorrect
			expect(publicDto.questions[0]).toEqual({
				orderIndex: 0,
				isCorrect: true
			});
			expect(publicDto.questions[1]).toEqual({
				orderIndex: 1,
				isCorrect: false
			});

			// Crucial security assertions: NO secret data leaked
			for (const q of publicDto.questions as any[]) {
				expect(q.prompt).toBeUndefined();
				expect(q.choices).toBeUndefined();
				expect(q.correctAnswer).toBeUndefined();
				expect(q.explanation).toBeUndefined();
				expect(q.generatedSeed).toBeUndefined();
				expect(q.scoreEarned).toBeUndefined();
			}
		});

		it('throws 404 for non-existent share ID', async () => {
			const { service } = setup();

			await expect(service.getPublicShare('shr_nonexistent12')).rejects.toThrow(
				/was not found or has been revoked/i
			);
		});

		it('throws 404 when share has been revoked', async () => {
			const { user, service, session, shareRepo } = setup();
			const event = createFakeEvent(user);
			const { publicId } = await service.createShare(event, { sessionId: session.id });

			// Revoke share
			await shareRepo.revokeShare(publicId);

			await expect(service.getPublicShare(publicId)).rejects.toThrow(
				/was not found or has been revoked/i
			);
		});
	});

	describe('revokeShare', () => {
		it('allows owner to revoke their active share', async () => {
			const { user, service, session } = setup();
			const event = createFakeEvent(user);
			const { publicId } = await service.createShare(event, { sessionId: session.id });

			await service.revokeShare(event, publicId);

			// Public access now fails
			await expect(service.getPublicShare(publicId)).rejects.toThrow(/revoked/i);
		});

		it('blocks non-owner from revoking another user share', async () => {
			const { user, service, session } = setup();
			const aliceEvent = createFakeEvent(user);
			const { publicId } = await service.createShare(aliceEvent, { sessionId: session.id });

			const eve = createFakeUser({ id: 'user-eve' });
			const eveEvent = createFakeEvent(eve);

			await expect(service.revokeShare(eveEvent, publicId)).rejects.toThrow(
				/not authorized to revoke/i
			);
		});
	});
});
