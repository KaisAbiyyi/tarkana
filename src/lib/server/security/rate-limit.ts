import { AppError } from '$lib/server/errors';

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

const store = new Map<string, RateLimitRecord>();

/**
 * Checks whether a given key has exceeded the rate limit.
 * Uses an in-memory fixed/sliding window counter.
 */
export function checkRateLimit(
	key: string,
	options: RateLimitOptions,
	now = Date.now()
): RateLimitResult {
	const current = store.get(key);

	if (!current || now >= current.resetTime) {
		const newRecord: RateLimitRecord = {
			count: 1,
			resetTime: now + options.windowMs
		};
		store.set(key, newRecord);
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
 * Enforces rate limiting on a sensitive action/key, throwing an AppError(429) if exceeded.
 */
export function enforceRateLimit(key: string, options: RateLimitOptions, now = Date.now()): void {
	const result = checkRateLimit(key, options, now);
	if (!result.allowed) {
		const retryAfterSeconds = Math.ceil(result.resetMs / 1000);
		const error = new AppError(
			429,
			'bad_request',
			`Rate limit exceeded. Please wait ${retryAfterSeconds} seconds.`
		);
		throw error;
	}
}

/**
 * Clears expired records to prevent unbounded memory growth.
 */
export function pruneRateLimitStore(now = Date.now()): void {
	for (const [key, record] of store.entries()) {
		if (now >= record.resetTime) {
			store.delete(key);
		}
	}
}

/**
 * Resets the in-memory store (primarily for unit tests).
 */
export function resetRateLimitStore(): void {
	store.clear();
}
