import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createRequestAuthAccessors } from './request-auth';

describe('request auth accessors', () => {
	it('deduplicates concurrent verified-user reads within one request', async () => {
		const getUser = vi.fn().mockResolvedValue({
			data: { user: { id: 'user-1' } },
			error: null
		});
		const client = { auth: { getUser } } as unknown as SupabaseClient;
		const accessors = createRequestAuthAccessors(client);

		const [first, second] = await Promise.all([accessors.getUser(), accessors.getUser()]);

		expect(first?.id).toBe('user-1');
		expect(second?.id).toBe('user-1');
		expect(getUser).toHaveBeenCalledTimes(1);
	});

	it('returns null and reuses the result when verification fails', async () => {
		const getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: new Error('expired')
		});
		const client = { auth: { getUser } } as unknown as SupabaseClient;
		const accessors = createRequestAuthAccessors(client);

		expect(await accessors.getUser()).toBeNull();
		expect(await accessors.getUser()).toBeNull();
		expect(getUser).toHaveBeenCalledTimes(1);
	});
});
