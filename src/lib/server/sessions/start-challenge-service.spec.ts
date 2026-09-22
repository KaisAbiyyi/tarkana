import { describe, expect, it } from 'vitest';
import { createStartChallengeService } from './start-challenge-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import {
	createChallengeSession,
	createQuestionRule,
	createSessionRepositoryFake
} from './test-fakes';

describe('start challenge service', () => {
	it('creates a session and returns a question without the correct answer', async () => {
		const profile = createProfile();
		const repository = createSessionRepositoryFake({
			categories: [
				{
					id: '11111111-1111-4111-8111-111111111111',
					name: 'Number',
					slug: 'number',
					description: null,
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			],
			rules: [
				createQuestionRule({
					categoryId: '11111111-1111-4111-8111-111111111111',
					ruleType: 'arithmetic_sequence'
				})
			]
		});
		const service = createStartChallengeService(repository, createProfileRepositoryFake(profile));

		const result = await service.start(createFakeEvent(createFakeUser({ id: profile.id })), {
			challengeType: 'quick',
			selectedMode: 'number_sequence',
			seed: 'start-seed'
		});

		expect(repository.createdSessions).toHaveLength(1);
		expect(result.currentQuestion).not.toHaveProperty('correctAnswer');
		expect(result.currentQuestion.questionType).toBe('number_sequence');
	});

	it('rejects unavailable selected modes', async () => {
		const profile = createProfile();
		const repository = createSessionRepositoryFake({
			categories: [],
			rules: [],
			session: createChallengeSession({ userId: profile.id })
		});
		const service = createStartChallengeService(repository, createProfileRepositoryFake(profile));

		await expect(
			service.start(createFakeEvent(createFakeUser({ id: profile.id })), {
				challengeType: 'quick',
				selectedMode: 'memory_pattern',
				seed: 'start-seed'
			})
		).rejects.toThrow();
	});

	it('allows unauthenticated starts and creates a guest session with guest cookie', async () => {
		const repository = createSessionRepositoryFake({
			categories: [
				{
					id: '11111111-1111-4111-8111-111111111111',
					name: 'Number',
					slug: 'number',
					description: null,
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			],
			rules: [
				createQuestionRule({
					categoryId: '11111111-1111-4111-8111-111111111111',
					ruleType: 'arithmetic_sequence'
				})
			]
		});
		const service = createStartChallengeService(repository, createProfileRepositoryFake(null));
		const event = createFakeEvent(null);

		const result = await service.start(event, {
			challengeType: 'quick',
			selectedMode: 'number_sequence',
			seed: 'guest-seed'
		});

		expect(result.isGuest).toBe(true);
		expect(repository.createdSessions).toHaveLength(1);
		expect(repository.createdSessions[0].userId).toBeNull();
		expect(repository.createdSessions[0].guestToken).toBeDefined();
		expect(event.cookies.get('tarkana_guest_token')).toBe(repository.createdSessions[0].guestToken);
	});
});
