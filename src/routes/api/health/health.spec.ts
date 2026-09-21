import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('$lib/server/db', () => ({
	getDb: vi.fn(() => ({
		execute: mockExecute
	}))
}));

import { GET } from './+server';

describe('Health Check API Endpoint', () => {
	beforeEach(() => {
		mockExecute.mockReset();
	});

	it(
		'returns 200 OK and healthy status when database is reachable',
		async () => {
			mockExecute.mockResolvedValueOnce([{ '?column?': 1 }]);

			const response = await GET({} as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.status).toBe('ok');
			expect(data.database).toBe('reachable');
			expect(data.version).toBe('0.1.0-beta.2');
			expect(data.timestamp).toBeDefined();
			expect(data).not.toHaveProperty('uptime');
		},
		10000
	);

	it(
		'returns 503 Service Unavailable when database ping fails',
		async () => {
			mockExecute.mockRejectedValueOnce(new Error('Connection timed out'));

			const response = await GET({} as any);
			expect(response.status).toBe(503);

			const data = await response.json();
			expect(data.status).toBe('error');
			expect(data.database).toBe('unreachable');
			expect(data.version).toBe('0.1.0-beta.2');
			expect(data).not.toHaveProperty('uptime');
			expect(data).not.toHaveProperty('error');
		},
		10000
	);
});
