import { describe, expect, it } from 'vitest';
import { sanitizeContext, isSensitiveKey } from './logger';

describe('Logger Sensitive Data Redaction', () => {
	it('identifies sensitive key variants accurately', () => {
		const sensitiveKeys = [
			'Authorization',
			'authorization',
			'cookie',
			'Cookie',
			'set-cookie',
			'Set-Cookie',
			'access_token',
			'accessToken',
			'refresh_token',
			'refreshToken',
			'apiKey',
			'api_key',
			'serviceRoleKey',
			'service_role_key',
			'password',
			'client_secret',
			'bearerToken'
		];

		for (const key of sensitiveKeys) {
			expect(isSensitiveKey(key), `Expected ${key} to be sensitive`).toBe(true);
		}

		const safeKeys = [
			'path',
			'status',
			'durationMs',
			'requestId',
			'userId',
			'locale',
			'challengeType'
		];
		for (const key of safeKeys) {
			expect(isSensitiveKey(key), `Expected ${key} to be safe`).toBe(false);
		}
	});

	it('redacts top-level and deeply nested sensitive fields in context', () => {
		const context = {
			path: '/api/challenge/start',
			requestId: 'req-123',
			authorization: 'Bearer raw-jwt-token',
			cookie: 'session=12345; auth=abcdef',
			nested: {
				auth: {
					token: 'super-secret-token'
				},
				headers: {
					authorization: 'Bearer admin-secret-key'
				},
				serviceRoleKey: 'supabase-service-role',
				publicConfig: 'active'
			},
			devices: [
				{ access_token: 'secret-a', name: 'device1' },
				{ apiKey: 'secret-b', name: 'device2' }
			]
		};

		const sanitized = sanitizeContext(context);

		expect(sanitized).toEqual({
			path: '/api/challenge/start',
			requestId: 'req-123',
			authorization: '[REDACTED]',
			cookie: '[REDACTED]',
			nested: {
				auth: {
					token: '[REDACTED]'
				},
				headers: {
					authorization: '[REDACTED]'
				},
				serviceRoleKey: '[REDACTED]',
				publicConfig: 'active'
			},
			devices: [
				{ access_token: '[REDACTED]', name: 'device1' },
				{ apiKey: '[REDACTED]', name: 'device2' }
			]
		});
	});
});
