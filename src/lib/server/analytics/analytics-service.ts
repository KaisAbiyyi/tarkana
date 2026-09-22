import {
	createAnalyticsRepository,
	type AnalyticsRepository,
	type FunnelResult,
	type RetentionResult
} from '$lib/server/db/repositories/analytics-repository';
import type { AnalyticsEvent } from '$lib/server/db/schema';
import {
	isCanonicalEvent,
	sanitizeEventProperties,
	type CanonicalEventName,
	type EventPropertyMap
} from '$lib/shared/analytics/events';
import { logger } from '$lib/server/observability/logger';

export interface TrackEventInput<T extends CanonicalEventName = CanonicalEventName> {
	id?: string;
	distinctId: string;
	userId?: string | null;
	event: T;
	properties?: EventPropertyMap[T] | Record<string, unknown>;
	timestamp?: Date;
}

export interface PostHogForwarder {
	capture(event: string, distinctId: string, properties: Record<string, unknown>): Promise<void>;
	alias(distinctId: string, aliasId: string): Promise<void>;
}

export function createPostHogForwarder(
	options: { apiKey?: string; host?: string } = {}
): PostHogForwarder {
	const apiKey = options.apiKey || process.env.POSTHOG_API_KEY;
	const host = (options.host || process.env.POSTHOG_HOST || 'https://app.posthog.com').replace(
		/\/$/,
		''
	);

	return {
		async capture(event, distinctId, properties) {
			if (!apiKey) return;
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 2500);

				await fetch(`${host}/capture/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						api_key: apiKey,
						event,
						properties: {
							distinct_id: distinctId,
							...properties
						},
						timestamp: new Date().toISOString()
					}),
					signal: controller.signal
				}).finally(() => clearTimeout(timer));
			} catch (error) {
				logger.warn('PostHog capture forwarder non-fatal failure', {
					context: { action: 'analytics_posthog_error', event, error: (error as Error).message }
				});
			}
		},

		async alias(distinctId, aliasId) {
			if (!apiKey) return;
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 2500);

				await fetch(`${host}/capture/`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						api_key: apiKey,
						event: '$create_alias',
						properties: {
							distinct_id: distinctId,
							alias: aliasId
						},
						timestamp: new Date().toISOString()
					}),
					signal: controller.signal
				}).finally(() => clearTimeout(timer));
			} catch (error) {
				logger.warn('PostHog alias forwarder non-fatal failure', {
					context: { action: 'analytics_posthog_alias_error', error: (error as Error).message }
				});
			}
		}
	};
}

export const DEFAULT_FUNNEL_STAGES: CanonicalEventName[] = [
	'landing_view',
	'challenge_started',
	'challenge_completed',
	'signup_completed',
	'guest_claim_succeeded'
];

export interface AnalyticsService {
	track<T extends CanonicalEventName>(input: TrackEventInput<T>): Promise<AnalyticsEvent>;
	identify(anonymousId: string, userId: string): Promise<void>;
	getFunnel(
		stages?: CanonicalEventName[],
		options?: { startDate?: Date; endDate?: Date }
	): Promise<FunnelResult>;
	getRetention(options: { cohortStartDate: Date; cohortEndDate: Date }): Promise<RetentionResult>;
}

export function createAnalyticsService(
	repository: AnalyticsRepository = createAnalyticsRepository(),
	posthog: PostHogForwarder = createPostHogForwarder()
): AnalyticsService {
	return {
		async track(input) {
			if (!isCanonicalEvent(input.event)) {
				throw new Error(`Invalid event name: ${input.event}`);
			}

			// Sanitize properties against strict allowlist & zero-PII
			const sanitizedProps = sanitizeEventProperties(input.event, input.properties ?? {});

			const eventId = input.id && isValidUuid(input.id) ? input.id : crypto.randomUUID();
			const timestamp = input.timestamp ?? new Date();

			// 1. Authoritative first-party persistence
			const event = await repository.insertEvent({
				id: eventId,
				distinctId: input.distinctId,
				userId: input.userId ?? null,
				event: input.event,
				properties: sanitizedProps,
				createdAt: timestamp
			});

			// 2. Non-blocking PostHog forwarder
			const actorId = input.userId ?? input.distinctId;
			posthog
				.capture(input.event, actorId, {
					...sanitizedProps,
					$insert_id: eventId
				})
				.catch(() => {});

			return event;
		},

		async identify(anonymousId, userId) {
			if (!anonymousId || !userId) return;

			// 1. Record immutable alias link
			await repository.createAlias({
				anonymousId,
				userId,
				createdAt: new Date()
			});

			// 2. Backfill historical events
			await repository.linkEventsToUser(anonymousId, userId);

			// 3. Forward alias to external provider
			posthog.alias(userId, anonymousId).catch(() => {});
		},

		async getFunnel(stages = DEFAULT_FUNNEL_STAGES, options = {}) {
			return repository.computeFunnel(stages, options);
		},

		async getRetention(options) {
			return repository.computeRetention(options);
		}
	};
}

let defaultService: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
	defaultService ??= createAnalyticsService();
	return defaultService;
}

function isValidUuid(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
