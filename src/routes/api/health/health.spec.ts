import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('$lib/server/db', () => ({
	getDb: vi.fn(() => ({
		execute: mockExecute
	}))
}));

describe('Health Check API Endpoint', () => {
	beforeEach(() => {
		mockExecute.mockReset();
	});

	it('returns 200 OK and healthy status when database is reachable', async () => {
		mockExecute.mockResolvedValueOnce([{ '?column?': 1 }]);
		const { GET } = await import('./+server');

		const response = await GET({} as any);
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.status).toBe('ok');
		expect(data.services.database).toBe('healthy');
		expect(typeof data.uptime).toBe('number');
		expect(data.timestamp).toBeDefined();
	});

	it('returns 503 Service Unavailable when database ping fails', async () => {
		mockExecute.mockRejectedValueOnce(new Error('Connection timed out'));
		const { GET } = await import('./+server');

		const response = await GET({} as any);
		expect(response.status).toBe(503);

		const data = await response.json();
		expect(data.status).toBe('unhealthy');
		expect(data.services.database).toBe('unreachable');
	});
});
