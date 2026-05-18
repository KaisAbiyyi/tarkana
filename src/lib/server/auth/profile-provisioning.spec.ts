import { describe, expect, it } from 'vitest';
import {
	buildDefaultDisplayName,
	provisionProfile,
	sanitizeDisplayName
} from './profile-provisioning';
import { createFakeUser, createProfile, createProfileRepositoryFake } from '$lib/server/test/fakes';

describe('profile provisioning', () => {
	it('returns an existing profile without creating another record', async () => {
		const repository = createProfileRepositoryFake(createProfile({ displayName: 'Ready' }));

		const profile = await provisionProfile({ user: createFakeUser(), repository });

		expect(profile.displayName).toBe('Ready');
		expect(repository.createdProfiles).toHaveLength(0);
	});

	it('creates default profile values on first login', async () => {
		const repository = createProfileRepositoryFake(null);

		const profile = await provisionProfile({
			user: createFakeUser({ email: 'fresh.user@example.com' }),
			repository
		});

		expect(profile).toMatchObject({
			displayName: 'fresh.user',
			role: 'user',
			rating: 0,
			rank: 'Unranked'
		});
		expect(repository.createdProfiles).toHaveLength(1);
	});

	it('sanitizes unsafe metadata for display names', () => {
		expect(sanitizeDisplayName('  Ada<script> Lovelace!!  ')).toBe('Adascript Lovelace');
	});

	it('prefers provider metadata over email local part', () => {
		expect(
			buildDefaultDisplayName(
				createFakeUser({
					email: 'email-name@example.com',
					user_metadata: { full_name: 'Metadata Name' }
				})
			)
		).toBe('Metadata Name');
	});
});
