import { describe, expect, it } from 'vitest';
import { createDuelService, toAnalyticsDuelId } from './duel-service';
import {
	createChallengeSession,
	createSessionAnswer,
	createSessionQuestion,
	createSessionRepositoryFake
} from '$lib/server/sessions/test-fakes';
import {
	createDuelRepositoryFake,
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import { GUEST_TOKEN_COOKIE, hashGuestToken } from '$lib/server/sessions/guest-token';
import type { ChallengeSession } from '$lib/server/db/schema';

describe('DuelService', () => {
	function setup(
		overrides: {
			session?: ChallengeSession;
			user?: any;
			guestToken?: string;
		} = {}
	) {
		const user =
			overrides.user !== undefined ? overrides.user : createFakeUser({ id: 'user-alice' });
		const profile = user ? createProfile({ id: user.id, displayName: 'AliceMaster' }) : null;
		const profileRepo = createProfileRepositoryFake(profile);
		const duelRepo = createDuelRepositoryFake();

		const defaultSession = createChallengeSession({
			id: '11111111-1111-4111-8111-111111111111',
			userId: user ? user.id : null,
			guestToken: overrides.guestToken ? hashGuestToken(overrides.guestToken) : null,
			challengeType: 'standard',
			status: 'completed',
			totalScore: 850,
			totalQuestions: 2,
			accuracy: 90,
			totalTimeSeconds: 45,
			rankAfter: 'Silver Solver',
			isSuspicious: false
		});

		const session = overrides.session ?? defaultSession;
		const q1 = createSessionQuestion({
			sessionId: session.id,
			orderIndex: 0,
			prompt: 'Solve equation 2x + 4 = 10',
			correctAnswer: '3',
			choices: ['1', '2', '3', '4'],
			difficultyScore: 100,
			timeLimitSeconds: 30
		});
		const q2 = createSessionQuestion({
			id: '22222222-2222-4222-8222-222222222222',
			sessionId: session.id,
			orderIndex: 1,
			prompt: 'Pattern AB, BC, CD, ?',
			correctAnswer: 'DE',
			choices: ['DE', 'EF', 'EE', 'DD'],
			difficultyScore: 100,
			timeLimitSeconds: 30
		});

		const a1 = createSessionAnswer({
			sessionQuestionId: q1.id,
			userId: session.userId,
			isCorrect: true,
			scoreEarned: 450,
			timeSpentSeconds: 20
		});
		const a2 = createSessionAnswer({
			id: '33333333-3333-4333-8333-333333333333',
			sessionQuestionId: q2.id,
			userId: session.userId,
			isCorrect: true,
			scoreEarned: 400,
			timeSpentSeconds: 25
		});

		const sessionRepo = createSessionRepositoryFake({
			session,
			questions: [q1, q2],
			answers: [a1, a2]
		});

		const service = createDuelService(duelRepo, sessionRepo, profileRepo);

		const cookiesRecord: Record<string, string> = {};
		if (overrides.guestToken) {
			cookiesRecord[GUEST_TOKEN_COOKIE] = overrides.guestToken;
		}

		const event = createFakeEvent(user, cookiesRecord);

		return {
			service,
			duelRepo,
			sessionRepo,
			profileRepo,
			session,
			user,
			event
		};
	}

	describe('createDuel', () => {
		it('creates a blind duel from a completed standard session', async () => {
			const { service, event, session } = setup();

			const result = await service.createDuel(event, { sessionId: session.id });

			expect(result.publicId).toMatch(/^chf_[a-zA-Z0-9_-]{12}$/);
			expect(result.duelUrl).toContain(`/duel/${result.publicId}`);
			expect(result.analyticsDuelId).toBe(toAnalyticsDuelId(result.publicId));
		});

		it('allows creating a duel from a completed quick session', async () => {
			const quickSession = createChallengeSession({
				id: '44444444-4444-4444-8444-444444444444',
				userId: 'user-alice',
				challengeType: 'quick',
				status: 'completed',
				totalScore: 400,
				accuracy: 80,
				totalTimeSeconds: 20,
				isSuspicious: false
			});
			const { service, event } = setup({ session: quickSession });

			const result = await service.createDuel(event, { sessionId: quickSession.id });
			expect(result.publicId).toBeDefined();
		});

		it('rejects sessions that are not completed', async () => {
			const inProgressSession = createChallengeSession({
				id: '55555555-5555-4555-8555-555555555555',
				userId: 'user-alice',
				challengeType: 'standard',
				status: 'in_progress',
				isSuspicious: false
			});
			const { service, event } = setup({ session: inProgressSession });

			await expect(service.createDuel(event, { sessionId: inProgressSession.id })).rejects.toThrow(
				'Only completed challenges can be used to create a duel'
			);
		});

		it('rejects suspicious sessions from duel creation', async () => {
			const suspiciousSession = createChallengeSession({
				id: '66666666-6666-4666-8666-666666666666',
				userId: 'user-alice',
				challengeType: 'standard',
				status: 'completed',
				isSuspicious: true
			});
			const { service, event } = setup({ session: suspiciousSession });

			await expect(service.createDuel(event, { sessionId: suspiciousSession.id })).rejects.toThrow(
				'Suspicious sessions cannot be used to create a duel'
			);
		});

		it('rejects ineligible challenge types (e.g. daily, long)', async () => {
			const dailySession = createChallengeSession({
				id: '77777777-7777-4777-8777-777777777777',
				userId: 'user-alice',
				challengeType: 'daily',
				status: 'completed',
				isSuspicious: false
			});
			const { service, event } = setup({ session: dailySession });

			await expect(service.createDuel(event, { sessionId: dailySession.id })).rejects.toThrow(
				'Only standard or quick logic challenges are eligible for Challenge-a-Friend duels'
			);
		});

		it('idempotently returns the existing active duel if one already exists for the session', async () => {
			const { service, event, session } = setup();

			const first = await service.createDuel(event, { sessionId: session.id });
			const second = await service.createDuel(event, { sessionId: session.id });

			expect(first.publicId).toBe(second.publicId);
		});

		it('allows guests to create duels using guest tokens and snapshots a safe pseudonym', async () => {
			const guestToken = 'guest-token-creator-12345';
			const guestSession = createChallengeSession({
				id: '88888888-8888-4888-8888-888888888888',
				userId: null,
				guestToken: hashGuestToken(guestToken),
				challengeType: 'standard',
				status: 'completed',
				totalScore: 700,
				accuracy: 80,
				totalTimeSeconds: 50,
				isSuspicious: false
			});
			const { service, event } = setup({
				session: guestSession,
				user: null,
				guestToken
			});

			const result = await service.createDuel(event, { sessionId: guestSession.id });
			expect(result.publicId).toBeDefined();

			const view = await service.getDuelPublicView(event, result.publicId);
			expect(view.creatorDisplayName).not.toContain(guestToken);
			expect(view.creatorDisplayName.length).toBeGreaterThan(3);
		});
	});

	describe('getDuelPublicView & Blind Secrecy', () => {
		it('strictly hides creator scores, accuracy, time, and questions in pre_game view', async () => {
			const { service, event, session } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			// A different visitor views the duel
			const visitorEvent = createFakeEvent(createFakeUser({ id: 'user-bob' }));
			const view = await service.getDuelPublicView(visitorEvent, created.publicId);

			expect(view.state).toBe('pre_game');
			expect(view.creatorDisplayName).toBe('AliceMaster');
			expect(view.sourceChallengeType).toBe('standard');
			expect(view.totalQuestions).toBe(2);

			// Ensure sensitive fields are not present on pre_game view
			expect((view as any).creatorScore).toBeUndefined();
			expect((view as any).creatorAccuracy).toBeUndefined();
			expect((view as any).creatorTotalTimeSeconds).toBeUndefined();
			expect((view as any).creatorQuestions).toBeUndefined();
		});

		it('shows pre_game view with isCreator=true for the creator before anyone finishes', async () => {
			const { service, event, session } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			const view = await service.getDuelPublicView(event, created.publicId);
			expect(view.state).toBe('pre_game');
			expect(view.isCreator).toBe(true);
		});
	});

	describe('acceptDuel', () => {
		it('prevents creator from accepting their own duel', async () => {
			const { service, event, session } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			await expect(service.acceptDuel(event, created.publicId)).rejects.toThrow(
				'Creators cannot accept their own duel'
			);
		});

		it('spawns a new unrated session with challengeType=duel and identical question set', async () => {
			const { service, event, session } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			const bob = createFakeUser({ id: 'user-bob' });
			const bobEvent = createFakeEvent(bob);

			const acceptResult = await service.acceptDuel(bobEvent, created.publicId);
			expect(acceptResult.sessionId).toBeDefined();
			expect(acceptResult.questions?.length).toBe(2);
			expect(acceptResult.isResumed).toBe(false);

			// Questions should not leak correct answers or explanations
			for (const q of acceptResult.questions ?? []) {
				expect((q as any).correctAnswer).toBeUndefined();
				expect((q as any).explanation).toBeUndefined();
			}
		});

		it('returns existing session idempotently when accepted again (no replay farming)', async () => {
			const { service, event, session } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			const bob = createFakeUser({ id: 'user-bob' });
			const bobEvent = createFakeEvent(bob);

			const first = await service.acceptDuel(bobEvent, created.publicId);
			const second = await service.acceptDuel(bobEvent, created.publicId);

			expect(first.sessionId).toBe(second.sessionId);
			expect(second.isResumed).toBe(true);
		});

		it('rejects new accepts after expiration but permits resuming in-progress attempts', async () => {
			const { service, event, session, duelRepo } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			const bob = createFakeUser({ id: 'user-bob' });
			const bobEvent = createFakeEvent(bob);

			// Bob accepts before expiration
			const bobSession = await service.acceptDuel(bobEvent, created.publicId);

			// Fast-forward expiration: set expiresAt in the past
			const duelRecord = await duelRepo.findDuelByPublicId(created.publicId);
			if (duelRecord) {
				duelRecord.expiresAt = new Date(Date.now() - 3600 * 1000);
			}

			// New user Charlie tries to accept expired duel
			const charlie = createFakeUser({ id: 'user-charlie' });
			const charlieEvent = createFakeEvent(charlie);
			await expect(service.acceptDuel(charlieEvent, created.publicId)).rejects.toThrow(
				'Duel invitation has expired'
			);

			// But Bob can resume his in-progress attempt!
			const resumed = await service.acceptDuel(bobEvent, created.publicId);
			expect(resumed.sessionId).toBe(bobSession.sessionId);
			expect(resumed.isResumed).toBe(true);
		});
	});

	describe('revocation', () => {
		it('allows creator to revoke duel, blocking future access', async () => {
			const { service, event, session } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			await service.revokeDuel(event, created.publicId);

			const bobEvent = createFakeEvent(createFakeUser({ id: 'user-bob' }));
			await expect(service.getDuelPublicView(bobEvent, created.publicId)).rejects.toThrow(
				'Duel invitation has been revoked'
			);
			await expect(service.acceptDuel(bobEvent, created.publicId)).rejects.toThrow(
				'Duel invitation has been revoked'
			);
		});

		it('forbids non-creators from revoking duel', async () => {
			const { service, event, session } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			const intruderEvent = createFakeEvent(createFakeUser({ id: 'user-intruder' }));
			await expect(service.revokeDuel(intruderEvent, created.publicId)).rejects.toThrow(
				'Only the creator can revoke this duel'
			);
		});
	});

	describe('completed view & winner resolution', () => {
		it('reveals head-to-head comparison and winner resolution once participant finishes', async () => {
			const { service, event, session, duelRepo } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			const bob = createFakeUser({ id: 'user-bob' });
			const bobEvent = createFakeEvent(bob);
			const acceptResult = await service.acceptDuel(bobEvent, created.publicId);

			// Complete Bob's participant attempt with a higher score
			await duelRepo.completeParticipant({
				sessionId: acceptResult.sessionId,
				score: 950,
				accuracy: 95,
				totalTimeSeconds: 40,
				isSuspicious: false,
				completedAt: new Date()
			});

			const view = await service.getDuelPublicView(bobEvent, created.publicId);

			expect(view.state).toBe('completed');
			if (view.state === 'completed') {
				expect(view.creatorScore).toBe(850);
				expect(view.creatorAccuracy).toBe(90);
				expect(view.outcome).toBe('win'); // Bob won!
				expect(view.standings.length).toBe(2);
				expect(view.standings[0].userId).toBe(bob.id);
				expect(view.standings[1].isCreator).toBe(true);
			}
		});

		it('excludes suspicious sessions from winner resolution', async () => {
			const { service, event, session, duelRepo } = setup();
			const created = await service.createDuel(event, { sessionId: session.id });

			const cheater = createFakeUser({ id: 'user-cheater' });
			const cheaterEvent = createFakeEvent(cheater);
			const acceptResult = await service.acceptDuel(cheaterEvent, created.publicId);

			// Mark as suspicious
			await duelRepo.completeParticipant({
				sessionId: acceptResult.sessionId,
				score: 1000,
				accuracy: 100,
				totalTimeSeconds: 1,
				isSuspicious: true,
				completedAt: new Date()
			});

			const view = await service.getDuelPublicView(cheaterEvent, created.publicId);
			if (view.state === 'completed') {
				expect(view.outcome).toBe('loss'); // Suspicious is automatic loss
				// Cheater is excluded from valid standings
				expect(view.standings.some((s) => s.userId === cheater.id)).toBe(false);
			}
		});
	});
});
