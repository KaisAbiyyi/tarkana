import { describe, expect, it, vi } from 'vitest';
import { forbidden } from '$lib/server/errors';
import { getRuleInventory } from '$lib/server/challenge/generators/registry';

const mockRequireAdmin = vi.fn();

vi.mock('$lib/server/auth/guards', () => ({
	requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args)
}));

describe('Admin Generator Health Server Load & Actions', () => {
	it('blocks non-admin users from loading the health dashboard', async () => {
		mockRequireAdmin.mockRejectedValueOnce(forbidden('Admin access required'));

		const { load } = await import('./+page.server');
		await expect(
			load({
				locals: { locale: 'en' }
			} as any)
		).rejects.toThrow('Admin access required');
	});

	it('loads dynamic rule inventory and healthy samples for authenticated admin', async () => {
		mockRequireAdmin.mockResolvedValueOnce({ id: 'admin-1', role: 'admin' });

		const { load } = await import('./+page.server');
		const result = await load({
			locals: { locale: 'en' }
		} as any);

		if (!result) throw new Error('Expected load result to be defined');

		const expectedRuleCount = getRuleInventory().length;
		expect(result.ruleCount).toBe(expectedRuleCount);
		expect(result.samples).toHaveLength(expectedRuleCount);
		expect(result.healthyCount).toBe(expectedRuleCount);
		expect(result.allHealthy).toBe(true);
		expect(result.runtime.nodeVersion).toBeTruthy();
	});

	it('rejects seeds longer than 64 characters in diagnose action', async () => {
		mockRequireAdmin.mockResolvedValueOnce({ id: 'admin-1', role: 'admin' });

		const { actions } = await import('./+page.server');
		const formData = new FormData();
		formData.set('ruleType', 'arithmetic_sequence');
		formData.set('difficulty', 'medium');
		formData.set('seed', 'a'.repeat(65)); // 65 chars, exceeds limit

		const response = await actions.diagnose({
			request: { formData: async () => formData },
			locals: { locale: 'en' }
		} as any);

		expect(response).toMatchObject({
			status: 400,
			data: {
				error: expect.stringContaining('at most 64 characters')
			}
		});
	});

	it('rejects invalid difficulty band in diagnose action', async () => {
		mockRequireAdmin.mockResolvedValueOnce({ id: 'admin-1', role: 'admin' });

		const { actions } = await import('./+page.server');
		const formData = new FormData();
		formData.set('ruleType', 'arithmetic_sequence');
		formData.set('difficulty', 'super_extreme');
		formData.set('seed', 'test-seed');

		const response = await actions.diagnose({
			request: { formData: async () => formData },
			locals: { locale: 'en' }
		} as any);

		expect(response).toMatchObject({
			status: 400,
			data: {
				error: expect.stringContaining('Invalid difficulty band')
			}
		});
	});

	it('executes live diagnostic and validates structural, semantic, and replay contracts', async () => {
		mockRequireAdmin.mockResolvedValueOnce({ id: 'admin-1', role: 'admin' });

		const { actions } = await import('./+page.server');
		const formData = new FormData();
		formData.set('ruleType', 'arithmetic_sequence');
		formData.set('difficulty', 'medium');
		formData.set('seed', 'admin-live-diag-001');

		const response = await actions.diagnose({
			request: { formData: async () => formData },
			locals: { locale: 'en' }
		} as any);

		expect(response).toMatchObject({
			success: true,
			error: null,
			diagnostic: {
				ruleType: 'arithmetic_sequence',
				questionType: 'number_sequence',
				difficulty: 'medium',
				seed: 'admin-live-diag-001',
				structural: { valid: true, errors: [] },
				semantic: { valid: true },
				choices: { unique: true, unambiguous: true },
				replay: { deterministic: true }
			}
		});
	});
});
