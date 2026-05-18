import { CHALLENGE_TYPES } from '$lib/shared/constants/challenge';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9 _.-]{2,32}$/;

export function isUuid(value: string): boolean {
	return UUID_PATTERN.test(value);
}

export function requireUuid(value: unknown, fieldName: string): string {
	if (typeof value !== 'string' || !isUuid(value)) {
		throw new ValidationError(`${fieldName} must be a valid UUID`);
	}

	return value;
}

export function parsePositiveInteger(value: unknown, fieldName: string, max = 100): number {
	const numericValue = typeof value === 'string' ? Number(value) : value;

	if (!Number.isInteger(numericValue) || Number(numericValue) <= 0 || Number(numericValue) > max) {
		throw new ValidationError(`${fieldName} must be a positive integer up to ${max}`);
	}

	return Number(numericValue);
}

export function parsePagination(searchParams: URLSearchParams): { limit: number; offset: number } {
	const limitParam = searchParams.get('limit');
	const offsetParam = searchParams.get('offset');
	const limit = limitParam === null ? 20 : Number(limitParam);
	const offset = offsetParam === null ? 0 : Number(offsetParam);

	if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
		throw new ValidationError('limit must be between 1 and 100');
	}

	if (!Number.isInteger(offset) || offset < 0) {
		throw new ValidationError('offset must be zero or greater');
	}

	return { limit, offset };
}

export function parseDisplayName(value: unknown): string {
	if (typeof value !== 'string') {
		throw new ValidationError('displayName must be text');
	}

	const displayName = value.trim().replace(/\s+/g, ' ');
	if (!DISPLAY_NAME_PATTERN.test(displayName)) {
		throw new ValidationError(
			'displayName must be 2-32 characters using letters, numbers, spaces, _ . or -'
		);
	}

	return displayName;
}

export function parseChallengeType(value: unknown): (typeof CHALLENGE_TYPES)[number] {
	if (typeof value !== 'string' || !CHALLENGE_TYPES.includes(value as never)) {
		throw new ValidationError('challengeType is invalid');
	}

	return value as (typeof CHALLENGE_TYPES)[number];
}

export function parseRecord(value: unknown, fieldName: string): Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new ValidationError(`${fieldName} must be an object`);
	}

	return value as Record<string, unknown>;
}

export class ValidationError extends Error {
	readonly name = 'ValidationError';
}
