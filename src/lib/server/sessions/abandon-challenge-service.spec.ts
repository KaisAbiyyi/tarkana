import { describe, it, expect } from 'vitest';
import { createAbandonChallengeService } from './abandon-challenge-service';
import { createProfileRepositoryFake, createProfile } from '$lib/server/test/fakes';
import { createSessionRepositoryFake, createChallengeSession } from './test-fakes';

describe('AbandonChallengeService', () => {
	it('should abandon an in_progress session', async () => {
		const session = createChallengeSession({ status: 'in_progress', userId: 'user-1' });
		const sessionRepository = createSessionRepositoryFake({ session });
		const profileRepository = createProfileRepositoryFake(createProfile({ id: 'user-1' }));
		const service = createAbandonChallengeService(sessionRepository, profileRepository);

		const result = await service.abandon(
			{ locals: { getUser: async () => ({ id: 'user-1' }) } } as any,
			{ sessionId: session.id }
		);

		expect(result.success).toBe(true);
		
		const updatedSession = await sessionRepository.findSessionById(session.id);
		expect(updatedSession?.status).toBe('abandoned');
	});

	it('should throw error if session is not in_progress', async () => {
		const session = createChallengeSession({ status: 'completed', userId: 'user-1' });
		const sessionRepository = createSessionRepositoryFake({ session });
		const profileRepository = createProfileRepositoryFake(createProfile({ id: 'user-1' }));
		const service = createAbandonChallengeService(sessionRepository, profileRepository);

		await expect(
			service.abandon({ locals: { getUser: async () => ({ id: 'user-1' }) } } as any, { sessionId: session.id })
		).rejects.toThrow('Can only abandon in_progress sessions');
	});
});
