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
			'x-api-key',
			'X-API-KEY',
			'serviceRoleKey',
			'service_role_key',
			'secret',
			'client_secret',
			'clientSecret',
			'password',
			'passphrase',
			'private_key',
			'privateKey',
			'bearerToken',
			'database_url',
			'DATABASE_URL',
			'postgres_url',
			'direct_url'
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
			'challengeType',
			'accuracy',
			'score'
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
					authorization: 'Bearer admin-secret-key',
					'x-api-key': 'secret-header-api-key'
				},
				serviceRoleKey: 'supabase-service-role',
				database_url: 'postgresql://postgres:secret@db.local:5432/tarkana',
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
					authorization: '[REDACTED]',
					'x-api-key': '[REDACTED]'
				},
				serviceRoleKey: '[REDACTED]',
				database_url: '[REDACTED]',
				publicConfig: 'active'
			},
			devices: [
				{ access_token: '[REDACTED]', name: 'device1' },
				{ apiKey: '[REDACTED]', name: 'device2' }
			]
		});
	});

	it('handles circular references without exceeding call stack', () => {
		const circularContext: Record<string, unknown> = {
			name: 'circular-test',
			password: 'my-super-secret-password'
		};
		circularContext.self = circularContext;

		const sanitized = sanitizeContext(circularContext);

		expect(sanitized).toBeDefined();
		expect(sanitized!.password).toBe('[REDACTED]');
		expect(sanitized!.self).toEqual({ '[Circular]': true });
	});

	it('handles objects created with Object.create(null)', () => {
		const nullProtoObj: Record<string, unknown> = Object.create(null);
		nullProtoObj.apiKey = 'null-proto-secret';
		nullProtoObj.action = 'safe-action';

		const sanitized = sanitizeContext(nullProtoObj);

		expect(sanitized).toBeDefined();
		expect(sanitized!.apiKey).toBe('[REDACTED]');
		expect(sanitized!.action).toBe('safe-action');
	});

	it('does not mutate the original input context object', () => {
		const original = {
			authorization: 'Bearer secret-token',
			user: {
				password: 'raw-password'
			}
		};

		const sanitized = sanitizeContext(original);

		expect(sanitized!.authorization).toBe('[REDACTED]');
		expect(original.authorization).toBe('Bearer secret-token');
		expect(original.user.password).toBe('raw-password');
	});
});
