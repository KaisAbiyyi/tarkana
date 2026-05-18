import { describe, expect, it } from 'vitest';
import { assertOwner, requireAdmin, requireProfile, requireUser } from './guards';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';

describe('auth guards', () => {
	it('rejects unauthenticated access', async () => {
		await expect(requireUser(createFakeEvent(null))).rejects.toMatchObject({
			status: 401,
			code: 'unauthorized'
		});
	});

	it('accepts authenticated users', async () => {
		const user = createFakeUser();
		await expect(requireUser(createFakeEvent(user))).resolves.toMatchObject({ id: user.id });
	});

	it('loads or provisions profile for authenticated users', async () => {
		const profile = createProfile({ displayName: 'Existing' });
		const event = createFakeEvent(createFakeUser({ id: profile.id }));

		await expect(
			requireProfile(event, createProfileRepositoryFake(profile))
		).resolves.toMatchObject({
			id: profile.id,
			displayName: 'Existing'
		});
	});

	it('rejects user role from admin access', async () => {
		const profile = createProfile({ role: 'user' });

		await expect(
			requireAdmin(
				createFakeEvent(createFakeUser({ id: profile.id })),
				createProfileRepositoryFake(profile)
			)
		).rejects.toMatchObject({ status: 403, code: 'forbidden' });
	});

	it('accepts admin role', async () => {
		const profile = createProfile({ role: 'admin' });

		await expect(
			requireAdmin(
				createFakeEvent(createFakeUser({ id: profile.id })),
				createProfileRepositoryFake(profile)
			)
		).resolves.toMatchObject({ role: 'admin' });
	});

	it('rejects owner mismatch', () => {
		expect(() => assertOwner('user-a', 'user-b')).toThrow('own data');
	});
});
