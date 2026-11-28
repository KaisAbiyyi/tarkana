import { describe, expect, it, vi } from 'vitest';
import { forbidden } from '$lib/server/errors';

vi.mock('$lib/server/auth/guards', () => ({
	requireAdmin: vi.fn(async () => {
		throw forbidden('Admin access is required');
	})
}));

import { load } from './+layout.server';

describe('admin layout guard', () => {
	it('returns a SvelteKit 403 response for authenticated non-admin users', async () => {
		await expect(
			load({ locals: { locale: 'en' } } as Parameters<typeof load>[0])
		).rejects.toMatchObject({
			status: 403,
			body: { message: 'You do not have access to this page.' }
		});
	});
});
