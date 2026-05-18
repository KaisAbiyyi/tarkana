import { describe, expect, it } from 'vitest';
import { createProfileService } from './profile-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';

describe('profile service', () => {
	it('updates display name only through the repository', async () => {
		const profile = createProfile({ rating: 500, rank: 'Silver Solver' });
		const repository = createProfileRepositoryFake(profile);
		const service = createProfileService(repository);

		const result = await service.updateDisplayName(
			createFakeEvent(createFakeUser({ id: profile.id })),
			'  New Name  '
		);

		expect(result).toMatchObject({
			displayName: 'New Name',
			rating: 500,
			rank: 'Silver Solver',
			role: 'user'
		});
		expect(repository.updatedDisplayNames).toEqual(['New Name']);
	});

	it('rejects invalid display names', async () => {
		const profile = createProfile();
		const service = createProfileService(createProfileRepositoryFake(profile));

		await expect(
			service.updateDisplayName(createFakeEvent(createFakeUser({ id: profile.id })), '<bad>')
		).rejects.toThrow('displayName');
	});
});
