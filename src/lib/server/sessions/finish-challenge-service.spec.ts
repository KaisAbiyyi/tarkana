import { describe, expect, it } from 'vitest';
import { createFinishChallengeService } from './finish-challenge-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import {
	createChallengeSession,
	createSessionAnswer,
	createSessionQuestion,
	createSessionRepositoryFake
} from './test-fakes';

describe('finish challenge service', () => {
	it('computes final score and updates rating server-side', async () => {
		const profile = createProfile({ rating: 490, rank: 'Bronze Mind' });
		const session = createChallengeSession({
			userId: profile.id,
			ratingBefore: profile.rating,
			ratingAfter: profile.rating,
			rankBefore: profile.rank,
			rankAfter: profile.rank,
			totalQuestions: 2
		});
		const firstQuestion = createSessionQuestion({ sessionId: session.id, orderIndex: 0 });
		const secondQuestion = createSessionQuestion({
			id: '22222222-2222-4222-8222-222222222222',
			sessionId: session.id,
			orderIndex: 1
		});
		const repository = createSessionRepositoryFake({
			session,
			questions: [firstQuestion, secondQuestion],
			answers: [
				createSessionAnswer({ sessionQuestionId: firstQuestion.id, userId: profile.id }),
				createSessionAnswer({
					id: '33333333-3333-4333-8333-333333333333',
					sessionQuestionId: secondQuestion.id,
					userId: profile.id
				})
			]
		});
		const service = createFinishChallengeService(repository, createProfileRepositoryFake(profile));

		const result = await service.finish(createFakeEvent(createFakeUser({ id: profile.id })), {
			sessionId: session.id
		});

		expect(result).toMatchObject({
			accuracy: 100,
			ratingBefore: 490,
			ratingAfter: 530,
			ratingDelta: 40,
			rankAfter: 'Silver Solver',
			rankPromoted: true
		});
		expect(result.review[0]).toHaveProperty('correctAnswer');
	});

	it('is idempotent for completed sessions', async () => {
		const profile = createProfile({ rating: 530, rank: 'Silver Solver' });
		const session = createChallengeSession({
			userId: profile.id,
			status: 'completed',
			totalScore: 150,
			accuracy: 100,
			ratingBefore: 490,
			ratingAfter: 530,
			ratingDelta: 40,
			rankBefore: 'Bronze Mind',
			rankAfter: 'Silver Solver'
		});
		const question = createSessionQuestion({ sessionId: session.id });
		const repository = createSessionRepositoryFake({
			session,
			questions: [question],
			answers: [createSessionAnswer({ sessionQuestionId: question.id, userId: profile.id })]
		});
		const service = createFinishChallengeService(repository, createProfileRepositoryFake(profile));

		const result = await service.finish(createFakeEvent(createFakeUser({ id: profile.id })), {
			sessionId: session.id
		});

		expect(repository.completedSessions).toHaveLength(0);
		expect(result.ratingAfter).toBe(530);
	});

	it('does not reveal review answers for abandoned sessions', async () => {
		const profile = createProfile();
		const session = createChallengeSession({
			userId: profile.id,
			status: 'abandoned'
		});
		const question = createSessionQuestion({ sessionId: session.id });
		const repository = createSessionRepositoryFake({
			session,
			questions: [question],
			answers: [createSessionAnswer({ sessionQuestionId: question.id, userId: profile.id })]
		});
		const service = createFinishChallengeService(repository, createProfileRepositoryFake(profile));

		await expect(
			service.finish(createFakeEvent(createFakeUser({ id: profile.id })), {
				sessionId: session.id
			})
		).rejects.toMatchObject({ status: 400 });
	});

	it('finishes guest challenges without updating user profiles and marks them claimable', async () => {
		const guestToken = 'guest-token-123456789012345678901234567890123456789012345678901234567890';
		const session = createChallengeSession({
			userId: null,
			guestToken,
			ratingBefore: 0,
			ratingAfter: 0,
			rankBefore: 'Unranked',
			rankAfter: 'Unranked',
			totalQuestions: 1
		});
		const question = createSessionQuestion({ sessionId: session.id, orderIndex: 0 });
		const repository = createSessionRepositoryFake({
			session,
			questions: [question],
			answers: [createSessionAnswer({ sessionQuestionId: question.id, userId: null })]
		});
		const service = createFinishChallengeService(repository, createProfileRepositoryFake(null));

		const event = createFakeEvent(null, { tarkana_guest_token: guestToken });
		const result = await service.finish(event, { sessionId: session.id });

		expect(result.isGuest).toBe(true);
		expect(result.canClaim).toBe(true);
		expect(result.accuracy).toBe(100);
		expect(repository.completedSessions).toHaveLength(0);
	});

	it('auto-claims guest session when an authenticated user visits the finished result', async () => {
		const guestToken = 'guest-token-123456789012345678901234567890123456789012345678901234567890';
		const profile = createProfile({ rating: 100, rank: 'Bronze Mind' });
		const session = createChallengeSession({
			userId: null,
			guestToken,
			status: 'completed',
			totalScore: 150,
			accuracy: 100,
			ratingDelta: 40
		});
		const question = createSessionQuestion({ sessionId: session.id, orderIndex: 0 });
		const repository = createSessionRepositoryFake({
			session,
			questions: [question],
			answers: [createSessionAnswer({ sessionQuestionId: question.id, userId: null })]
		});
		const service = createFinishChallengeService(repository, createProfileRepositoryFake(profile));

		const event = createFakeEvent(createFakeUser({ id: profile.id }), {
			tarkana_guest_token: guestToken
		});
		const result = await service.finish(event, { sessionId: session.id });

		expect(result.isGuest).toBe(false);
		expect(result.canClaim).toBe(false);
	});
});
