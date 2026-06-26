import { describe, it, expect } from 'vitest';
import { createActiveChallengeService } from './active-challenge-service';
import { createProfileRepositoryFake, createProfile } from '$lib/server/test/fakes';
import { createSessionRepositoryFake, createChallengeSession, createSessionQuestion } from './test-fakes';

describe('ActiveChallengeService', () => {
	it('should return hasActive false if no session found', async () => {
		const sessionRepository = createSessionRepositoryFake({
			session: createChallengeSession({ status: 'completed' })
		});
		const profileRepository = createProfileRepositoryFake();
		const service = createActiveChallengeService(sessionRepository, profileRepository);

		const result = await service.getActive({ locals: { getUser: async () => ({ id: 'user-1' }) } } as any);
		expect(result.hasActive).toBe(false);
	});

	it('should abandon session if older than 24 hours', async () => {
		const oldDate = new Date();
		oldDate.setHours(oldDate.getHours() - 25);
		
		const sessionRepository = createSessionRepositoryFake({
			session: createChallengeSession({ status: 'in_progress', updatedAt: oldDate, userId: 'user-1' })
		});
		const profileRepository = createProfileRepositoryFake(createProfile({ id: 'user-1' }));
		const service = createActiveChallengeService(sessionRepository, profileRepository);

		const result = await service.getActive({ locals: { getUser: async () => ({ id: 'user-1' }) } } as any);
		expect(result.hasActive).toBe(false);
		
		const activeSession = await sessionRepository.findActiveSession('user-1');
		expect(activeSession).toBeNull();
	});

	it('should return active session if valid and not expired', async () => {
		const now = new Date();
		const session = createChallengeSession({ status: 'in_progress', updatedAt: now, userId: 'user-1' });
		const question = createSessionQuestion({ sessionId: session.id });
		
		const sessionRepository = createSessionRepositoryFake({
			session,
			questions: [question]
		});
		const profileRepository = createProfileRepositoryFake(createProfile({ id: 'user-1' }));
		const service = createActiveChallengeService(sessionRepository, profileRepository);

		const result = await service.getActive({ locals: { getUser: async () => ({ id: 'user-1' }) } } as any);
		expect(result.hasActive).toBe(true);
		expect(result.isComplete).toBe(false);
		expect(result.currentQuestion).toBeDefined();
	});
});
