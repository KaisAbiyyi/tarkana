/**
 * Tarkana Canonical Analytics Event Definitions & Zero-PII Sanitizer
 */

export const CANONICAL_EVENTS = [
	'landing_view',
	'challenge_started',
	'first_question_seen',
	'question_answered',
	'challenge_completed',
	'challenge_abandoned',
	'claim_cta_viewed',
	'signup_started',
	'signup_completed',
	'guest_claim_succeeded',
	'result_shared',
	'return_visit'
] as const;

export type CanonicalEventName = (typeof CANONICAL_EVENTS)[number];

export function isCanonicalEvent(name: string): name is CanonicalEventName {
	return CANONICAL_EVENTS.includes(name as CanonicalEventName);
}

export interface LandingViewProperties {
	locale?: string;
	referrer?: string;
	is_returning?: boolean;
}

export interface ChallengeStartedProperties {
	challenge_type: string;
	is_guest: boolean;
	session_id: string;
	question_count?: number;
}

export interface FirstQuestionSeenProperties {
	session_id: string;
	question_type?: string;
	difficulty?: number;
}

export interface QuestionAnsweredProperties {
	session_id: string;
	question_index: number;
	question_type?: string;
	is_correct: boolean;
	time_spent_seconds: number;
}

export interface ChallengeCompletedProperties {
	session_id: string;
	challenge_type: string;
	total_score: number;
	accuracy: number;
	total_time_seconds: number;
	is_guest: boolean;
	rank_after?: string;
	rating_after?: number;
}

export interface ChallengeAbandonedProperties {
	session_id: string;
	questions_answered: number;
	total_questions: number;
	time_spent_seconds?: number;
}

export interface ClaimCtaViewedProperties {
	session_id: string;
	placement?: string;
}

export interface SignupStartedProperties {
	source?: string;
}

export interface SignupCompletedProperties {
	user_id?: string;
	has_guest_sessions?: boolean;
}

export interface GuestClaimSucceededProperties {
	user_id?: string;
	claimed_count: number;
	is_provisional?: boolean;
	rating_after?: number;
}

export interface ResultSharedProperties {
	session_id: string;
	platform: string;
	score?: number;
}

export interface ReturnVisitProperties {
	days_since_last_visit?: number;
	has_active_account?: boolean;
}

export type EventPropertyMap = {
	landing_view: LandingViewProperties;
	challenge_started: ChallengeStartedProperties;
	first_question_seen: FirstQuestionSeenProperties;
	question_answered: QuestionAnsweredProperties;
	challenge_completed: ChallengeCompletedProperties;
	challenge_abandoned: ChallengeAbandonedProperties;
	claim_cta_viewed: ClaimCtaViewedProperties;
	signup_started: SignupStartedProperties;
	signup_completed: SignupCompletedProperties;
	guest_claim_succeeded: GuestClaimSucceededProperties;
	result_shared: ResultSharedProperties;
	return_visit: ReturnVisitProperties;
};

/**
 * Strict property allowlist per event. Any property not explicitly allowlisted is discarded.
 */
export const EVENT_PROPERTY_ALLOWLIST: Record<CanonicalEventName, readonly string[]> = {
	landing_view: ['locale', 'referrer', 'is_returning'],
	challenge_started: ['challenge_type', 'is_guest', 'session_id', 'question_count'],
	first_question_seen: ['session_id', 'question_type', 'difficulty'],
	question_answered: [
		'session_id',
		'question_index',
		'question_type',
		'is_correct',
		'time_spent_seconds'
	],
	challenge_completed: [
		'session_id',
		'challenge_type',
		'total_score',
		'accuracy',
		'total_time_seconds',
		'is_guest',
		'rank_after',
		'rating_after'
	],
	challenge_abandoned: [
		'session_id',
		'questions_answered',
		'total_questions',
		'time_spent_seconds'
	],
	claim_cta_viewed: ['session_id', 'placement'],
	signup_started: ['source'],
	signup_completed: ['user_id', 'has_guest_sessions'],
	guest_claim_succeeded: ['user_id', 'claimed_count', 'is_provisional', 'rating_after'],
	result_shared: ['session_id', 'platform', 'score'],
	return_visit: ['days_since_last_visit', 'has_active_account']
};

/**
 * Forbidden keys that indicate potential credentials or sensitive PII.
 */
const FORBIDDEN_KEY_PATTERN = /(password|token|secret|auth|credit|card|ssn|phone|email)/i;

/**
 * Pattern to detect email addresses within string values.
 */
const EMAIL_PATTERN = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;

/**
 * Sanitizes event properties against the allowlist and zero-PII requirements.
 * Throws an Error if strict mode is enabled and PII is detected, or silently strips
 * disallowed keys in lenient mode.
 */
export function sanitizeEventProperties<T extends CanonicalEventName>(
	event: T,
	rawProperties: EventPropertyMap[T] | Record<string, unknown> = {} as EventPropertyMap[T],
	options: { strict?: boolean } = {}
): Record<string, string | number | boolean | null> {
	if (!isCanonicalEvent(event)) {
		throw new Error(`Invalid analytics event: "${event}" is not a canonical event`);
	}

	const allowlist = new Set(EVENT_PROPERTY_ALLOWLIST[event]);
	const sanitized: Record<string, string | number | boolean | null> = {};

	for (const [key, value] of Object.entries((rawProperties ?? {}) as Record<string, unknown>)) {
		// Check for suspicious or forbidden keys
		if (FORBIDDEN_KEY_PATTERN.test(key)) {
			if (options.strict) {
				throw new Error(`PII / forbidden key detected in event "${event}": "${key}"`);
			}
			continue;
		}

		// Must be on the allowlist
		if (!allowlist.has(key)) {
			if (options.strict) {
				throw new Error(`Unrecognized or non-allowlisted property "${key}" for event "${event}"`);
			}
			continue;
		}

		if (value === null || value === undefined) {
			sanitized[key] = null;
			continue;
		}

		if (typeof value === 'boolean' || typeof value === 'number') {
			if (typeof value === 'number' && !Number.isFinite(value)) {
				continue;
			}
			sanitized[key] = value;
			continue;
		}

		if (typeof value === 'string') {
			// Check for embedded email pattern first
			if (EMAIL_PATTERN.test(value)) {
				if (options.strict) {
					throw new Error(
						`Potential email address detected in property "${key}" for event "${event}"`
					);
				}
				continue;
			}

			// Specific handling for referrer: keep only hostname/origin
			if (key === 'referrer') {
				let hostname: string;
				try {
					const parsed = new URL(value.includes('://') ? value : `https://${value}`);
					hostname = parsed.hostname;
				} catch {
					hostname = value
						.split('?')[0]
						.split('#')[0]
						.replace(/^\/\/|^https?:\/\//, '')
						.split('/')[0];
				}

				sanitized[key] = hostname.slice(0, 256);
				continue;
			}

			// Cap string length to 256 characters
			sanitized[key] = value.slice(0, 256);
			continue;
		}

		// Reject objects, functions, arrays, symbols to avoid payload smuggling
		if (options.strict) {
			throw new Error(`Complex data type not allowed for property "${key}" in event "${event}"`);
		}
	}

	return sanitized;
}
