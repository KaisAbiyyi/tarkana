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
});
