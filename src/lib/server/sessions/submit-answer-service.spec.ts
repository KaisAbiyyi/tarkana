import { describe, expect, it } from 'vitest';
import { createSubmitAnswerService } from './submit-answer-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import {
	createChallengeSession,
	createSessionQuestion,
	createSessionRepositoryFake
} from './test-fakes';

describe('submit answer service', () => {
	it('validates the answer server-side and returns the next safe question', async () => {
		const profile = createProfile();
		const session = createChallengeSession({ userId: profile.id });
		const firstQuestion = createSessionQuestion({ sessionId: session.id, orderIndex: 0 });
		const secondQuestion = createSessionQuestion({
			id: '22222222-2222-4222-8222-222222222222',
			sessionId: session.id,
			orderIndex: 1
		});
		const repository = createSessionRepositoryFake({
			session,
			questions: [firstQuestion, secondQuestion]
		});
		const service = createSubmitAnswerService(repository, createProfileRepositoryFake(profile));

		const result = await service.submit(createFakeEvent(createFakeUser({ id: profile.id })), {
			sessionId: session.id,
			sessionQuestionId: firstQuestion.id,
			selectedAnswer: firstQuestion.correctAnswer,
			timeSpentSeconds: 5
		});

		expect(result).toMatchObject({ isCorrect: true, scoreEarned: 150, isComplete: false });
		expect(result.nextQuestion).not.toHaveProperty('correctAnswer');
	});

	it('rejects duplicate answers', async () => {
		const profile = createProfile();
		const session = createChallengeSession({ userId: profile.id });
		const question = createSessionQuestion({ sessionId: session.id });
		const repository = createSessionRepositoryFake({
			session,
			questions: [question],
			answers: [
				{
					id: '33333333-3333-4333-8333-333333333333',
					sessionQuestionId: question.id,
					userId: profile.id,
					selectedAnswer: question.correctAnswer,
					isCorrect: true,
					timeSpentSeconds: 5,
					scoreEarned: 150,
					createdAt: new Date()
				}
			]
		});
		const service = createSubmitAnswerService(repository, createProfileRepositoryFake(profile));

		await expect(
			service.submit(createFakeEvent(createFakeUser({ id: profile.id })), {
				sessionId: session.id,
				sessionQuestionId: question.id,
				selectedAnswer: question.correctAnswer,
				timeSpentSeconds: 5
			})
		).rejects.toMatchObject({ status: 409 });
	});

	it('computes correctness from the stored answer only', async () => {
		const profile = createProfile();
		const session = createChallengeSession({ userId: profile.id });
		const question = createSessionQuestion({ sessionId: session.id, correctAnswer: '4' });
		const repository = createSessionRepositoryFake({
			session,
			questions: [question]
		});
		const service = createSubmitAnswerService(repository, createProfileRepositoryFake(profile));

		const result = await service.submit(createFakeEvent(createFakeUser({ id: profile.id })), {
			sessionId: session.id,
			sessionQuestionId: question.id,
			selectedAnswer: '5',
			timeSpentSeconds: 5
		});

		expect(result.isCorrect).toBe(false);
		expect(result.scoreEarned).toBe(0);
	});
});
