import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST as createPOST } from './create/+server';
import { POST as acceptPOST } from './accept/+server';
import { POST as revokePOST } from './revoke/+server';
import { GET as ogGET } from '../og/duel/[publicId]/+server';
import * as duelServiceModule from '$lib/server/duel/duel-service';
import * as renderDuelCardModule from '$lib/server/duel/render-duel-card';

vi.mock('$lib/server/security/rate-limit', () => ({
	enforceRateLimit: vi.fn().mockResolvedValue(undefined)
}));

describe('Duel API Endpoints', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('POST /api/duel/create', () => {
		it('returns 400 for invalid or missing sessionId', async () => {
			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				locals: {
					getUser: async () => null,
					locale: 'en'
				},
				request: {
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ sessionId: 'not-a-uuid' })
				}
			};

			const response = await createPOST(mockEvent);
			expect(response.status).toBe(400);

			const body = await response.json();
			expect(body.ok).toBe(false);
			expect(body.error.code).toBe('bad_request');
		});

		it('creates duel link and returns 200 with publicId, duelUrl, and analyticsDuelId', async () => {
			const validUuid = '11111111-1111-4111-8111-111111111111';
			const mockCreateDuel = vi.fn().mockResolvedValue({
				publicId: 'chf_test12345678',
				duelUrl: 'http://localhost:5173/duel/chf_test12345678',
				analyticsDuelId: 'ana_duel123'
			});

			vi.spyOn(duelServiceModule, 'createDuelService').mockReturnValue({
				createDuel: mockCreateDuel,
				getDuelPublicView: vi.fn(),
				acceptDuel: vi.fn(),
				revokeDuel: vi.fn()
			});

			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				locals: {
					getUser: async () => ({ id: 'usr-1' }),
					locale: 'en'
				},
				request: {
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ sessionId: validUuid })
				}
			};

			const response = await createPOST(mockEvent);
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.ok).toBe(true);
			expect(body.data).toEqual({
				publicId: 'chf_test12345678',
				duelUrl: 'http://localhost:5173/duel/chf_test12345678',
				analyticsDuelId: 'ana_duel123'
			});
			expect(mockCreateDuel).toHaveBeenCalledWith(mockEvent, { sessionId: validUuid });
		});
	});

	describe('POST /api/duel/accept', () => {
		it('returns 400 for missing or empty publicId', async () => {
			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				locals: {
					getUser: async () => null,
					locale: 'en'
				},
				request: {
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ publicId: '' })
				}
			};

			const response = await acceptPOST(mockEvent);
			expect(response.status).toBe(400);

			const body = await response.json();
			expect(body.ok).toBe(false);
			expect(body.error.code).toBe('bad_request');
		});

		it('accepts duel and returns 200 with sessionId and status', async () => {
			const mockAcceptDuel = vi.fn().mockResolvedValue({
				status: 'started',
				sessionId: '22222222-2222-4222-8222-222222222222',
				currentQuestion: { orderIndex: 0, prompt: 'Test question' }
			});

			vi.spyOn(duelServiceModule, 'createDuelService').mockReturnValue({
				createDuel: vi.fn(),
				getDuelPublicView: vi.fn(),
				acceptDuel: mockAcceptDuel,
				revokeDuel: vi.fn()
			});

			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				locals: {
					getUser: async () => ({ id: 'usr-bob' }),
					locale: 'en'
				},
				request: {
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ publicId: 'chf_test12345678' })
				}
			};

			const response = await acceptPOST(mockEvent);
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.ok).toBe(true);
			expect(body.data.sessionId).toBe('22222222-2222-4222-8222-222222222222');
			expect(body.data.status).toBe('started');
		});
	});

	describe('POST /api/duel/revoke', () => {
		it('returns 400 for missing or empty publicId', async () => {
			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				locals: {
					getUser: async () => ({ id: 'usr-1' }),
					locale: 'en'
				},
				request: {
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ publicId: '   ' })
				}
			};

			const response = await revokePOST(mockEvent);
			expect(response.status).toBe(400);

			const body = await response.json();
			expect(body.ok).toBe(false);
		});

		it('revokes duel and returns 200 with revoked flag', async () => {
			const mockRevokeDuel = vi.fn().mockResolvedValue(undefined);

			vi.spyOn(duelServiceModule, 'createDuelService').mockReturnValue({
				createDuel: vi.fn(),
				getDuelPublicView: vi.fn(),
				acceptDuel: vi.fn(),
				revokeDuel: mockRevokeDuel
			});

			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				locals: {
					getUser: async () => ({ id: 'usr-alice' }),
					locale: 'en'
				},
				request: {
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ publicId: 'chf_test12345678' })
				}
			};

			const response = await revokePOST(mockEvent);
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.ok).toBe(true);
			expect(body.data).toEqual({ revoked: true, publicId: 'chf_test12345678' });
		});
	});

	describe('GET /api/og/duel/[publicId]', () => {
		it('serves 1200x630 PNG with cache headers and attachment header when download=1', async () => {
			const fakePng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

			vi.spyOn(duelServiceModule, 'createDuelService').mockReturnValue({
				createDuel: vi.fn(),
				getDuelPublicView: vi.fn().mockResolvedValue({
					state: 'pre_game',
					publicId: 'chf_test123',
					creatorDisplayName: 'Alice',
					sourceChallengeType: 'standard',
					totalQuestions: 10
				}),
				acceptDuel: vi.fn(),
				revokeDuel: vi.fn()
			});

			vi.spyOn(renderDuelCardModule, 'renderDuelCardPng').mockReturnValue(fakePng);

			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				params: { publicId: 'chf_test123.png' },
				url: new URL('http://localhost:5173/api/og/duel/chf_test123.png?download=1'),
				locals: { locale: 'en' }
			};

			const response = await ogGET(mockEvent);
			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('image/png');
			expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
			expect(response.headers.get('Content-Disposition')).toContain(
				'attachment; filename="tarkana-duel-chf_test123.png"'
			);
		});
	});
});
