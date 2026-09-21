import { AppError } from '$lib/server/errors';
import { getDb } from '$lib/server/db';
import { rateLimits } from '$lib/server/db/schema';
import { logger } from '$lib/server/observability/logger';
import { sql } from 'drizzle-orm';
import { createHash } from 'crypto';

export type RateLimitOptions = {
	maxRequests: number;
	windowMs: number;
	failurePolicy?: RateLimitFailurePolicy;
};

export type RateLimitResult = {
	allowed: boolean;
	remaining: number;
	resetMs: number;
};

export type RateLimitFailurePolicy = 'memory_fallback' | 'fail_open' | 'fail_closed';

type RateLimitRecord = {
	count: number;
	resetTime: number;
};

const memoryStore = new Map<string, RateLimitRecord>();

const RATE_LIMIT_SALT = process.env.RATE_LIMIT_SALT || 'tarkana-default-salt-value';

/**
 * Pseudonymizes sensitive rate-limit keys (such as IP addresses or user identifiers)
 * using salted SHA-256 before persisting to PostgreSQL for GDPR and privacy compliance.
 */
export function hashRateLimitKey(rawKey: string): string {
	return createHash('sha256').update(`${rawKey}:${RATE_LIMIT_SALT}`).digest('hex');
}

/**
 * Checks in-memory rate limiter using a fixed-window counter with atomic reset.
 * Used as fallback when database is unreachable, or during deterministic unit tests.
 */
export function checkRateLimitMemory(
	key: string,
	options: RateLimitOptions,
	now = Date.now()
): RateLimitResult {
	const current = memoryStore.get(key);

	if (!current || now >= current.resetTime) {
		const newRecord: RateLimitRecord = {
			count: 1,
			resetTime: now + options.windowMs
		};
		memoryStore.set(key, newRecord);
		return {
			allowed: true,
			remaining: options.maxRequests - 1,
			resetMs: options.windowMs
		};
	}

	if (current.count >= options.maxRequests) {
		return {
			allowed: false,
			remaining: 0,
			resetMs: Math.max(0, current.resetTime - now)
		};
	}

	current.count += 1;
	return {
		allowed: true,
		remaining: options.maxRequests - current.count,
		resetMs: Math.max(0, current.resetTime - now)
	};
}

/**
 * Distributed rate limiter implementing a Fixed-Window Counter with Atomic Reset.
 *
 * Algorithm Details:
 * Requests are bucketed into a window expiring at `reset_at`. An atomic SQL `INSERT ... ON CONFLICT DO UPDATE`
 * increments the counter or resets the bucket if `reset_at <= NOW()`.
 *
 * Fault Tolerance:
 * If the database connection fails, behavior is governed by `options.failurePolicy` (or `RATE_LIMIT_ON_FAILURE`):
 * - 'memory_fallback' (default): falls back to local in-memory counter with logged warning.
 * - 'fail_open': allows the request through to prevent cascading outages.
 * - 'fail_closed': rejects the request (returns allowed: false) when security is paramount.
 */
export async function checkRateLimit(
	rawKey: string,
	options: RateLimitOptions,
	now = Date.now()
): Promise<RateLimitResult> {
	const failurePolicy: RateLimitFailurePolicy =
		options.failurePolicy ||
		(process.env.RATE_LIMIT_ON_FAILURE as RateLimitFailurePolicy) ||
		'memory_fallback';

	const hashedKey = hashRateLimitKey(rawKey);

	try {
		const db = getDb();
		const resetAt = new Date(now + options.windowMs);

		const result = await db.execute<{ count: number; reset_at: string }>(sql`
			INSERT INTO rate_limits (key, count, reset_at)
			VALUES (${hashedKey}, 1, ${resetAt})
			ON CONFLICT (key) DO UPDATE
			SET count = CASE
				WHEN rate_limits.reset_at <= NOW() THEN 1
				ELSE rate_limits.count + 1
			END,
			reset_at = CASE
				WHEN rate_limits.reset_at <= NOW() THEN ${resetAt}
				ELSE rate_limits.reset_at
			END,
			updated_at = NOW()
			RETURNING count, reset_at;
		`);

		const rows =
			(result as unknown as { rows?: Array<{ count: number; reset_at: string }> })?.rows ??
			(Array.isArray(result) ? (result as Array<{ count: number; reset_at: string }>) : []);

		if (rows.length > 0) {
			const row = rows[0];
			const count = Number(row.count);
			const resetTime = new Date(row.reset_at).getTime();
			const allowed = count <= options.maxRequests;
			const remaining = Math.max(0, options.maxRequests - count);
			const resetMs = Math.max(0, resetTime - now);
			return { allowed, remaining, resetMs };
		}
	} catch (error: unknown) {
		logger.warn('Distributed rate limit backend unreachable; executing fallback policy', {
			context: {
				keyPrefix: rawKey.split(':')[0],
				failurePolicy
			},
			error:
				error instanceof Error
					? { name: error.name, message: error.message, stack: error.stack }
					: { name: 'Error', message: String(error) }
		});

		if (failurePolicy === 'fail_open') {
			return {
				allowed: true,
				remaining: options.maxRequests - 1,
				resetMs: options.windowMs
			};
		}

		if (failurePolicy === 'fail_closed') {
			return {
				allowed: false,
				remaining: 0,
				resetMs: options.windowMs
			};
		}
	}

	return checkRateLimitMemory(rawKey, options, now);
}

/**
 * Enforces rate limiting on an action/key, throwing an AppError(429) if exceeded.
 */
export async function enforceRateLimit(
	key: string,
	options: RateLimitOptions,
	now = Date.now()
): Promise<void> {
	const result = await checkRateLimit(key, options, now);
	if (!result.allowed) {
		const retryAfterSeconds = Math.ceil(result.resetMs / 1000);
		throw new AppError(
			429,
			'bad_request',
			`Rate limit exceeded. Please wait ${retryAfterSeconds} seconds.`
		);
	}
}

/**
 * Cleans up expired rate limit records from PostgreSQL to prevent unbounded table growth.
 */
export async function pruneDatabaseRateLimits(db = getDb(), now = new Date()): Promise<number> {
	const deleted = await db
		.delete(rateLimits)
		.where(sql`${rateLimits.resetAt} < ${now}`)
		.returning({ key: rateLimits.key });

	return deleted.length;
}

/**
 * Clears expired memory records to prevent unbounded memory growth.
 */
export function pruneRateLimitStore(now = Date.now()): void {
	for (const [key, record] of memoryStore.entries()) {
		if (now >= record.resetTime) {
			memoryStore.delete(key);
		}
	}
}

/**
 * Resets the in-memory store (primarily for unit tests).
 */
export function resetRateLimitStore(): void {
	memoryStore.clear();
}
