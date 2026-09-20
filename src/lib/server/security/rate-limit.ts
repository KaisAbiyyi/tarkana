import { AppError } from '$lib/server/errors';
import { getDb } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export type RateLimitOptions = {
	maxRequests: number;
	windowMs: number;
};

export type RateLimitResult = {
	allowed: boolean;
	remaining: number;
	resetMs: number;
};

type RateLimitRecord = {
	count: number;
	resetTime: number;
};

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Checks in-memory rate limiter (used as fallback or for deterministic unit tests).
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
 * Distributed rate limiter.
 * Uses PostgreSQL atomic upsert across serverless instances, with fallback to in-memory guard.
 */
export async function checkRateLimit(
	key: string,
	options: RateLimitOptions,
	now = Date.now()
): Promise<RateLimitResult> {
	try {
		const db = getDb();
		const resetAt = new Date(now + options.windowMs);

		const result = await db.execute<{ count: number; reset_at: string }>(sql`
			INSERT INTO rate_limits (key, count, reset_at)
			VALUES (${key}, 1, ${resetAt})
			ON CONFLICT (key) DO UPDATE
			SET count = CASE
				WHEN rate_limits.reset_at <= NOW() THEN 1
				ELSE rate_limits.count + 1
			END,
			reset_at = CASE
				WHEN rate_limits.reset_at <= NOW() THEN ${resetAt}
				ELSE rate_limits.reset_at
			END
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
	} catch {
		// Gracefully fall back to in-memory limiter when DB is offline or in mock unit tests
	}

	return checkRateLimitMemory(key, options, now);
}

/**
 * Enforces rate limiting on a sensitive action/key, throwing an AppError(429) if exceeded.
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
