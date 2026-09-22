import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { getAnalyticsService } from '$lib/server/analytics/analytics-service';
import { getOrSetDistinctId } from '$lib/server/analytics/distinct-id';
import { isCanonicalEvent, type CanonicalEventName } from '$lib/shared/analytics/events';
import { ValidationError } from '$lib/shared/validation/common';

export const POST: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const rateLimitKey = `ip:${clientIp}:analytics-event`;
		await enforceRateLimit(rateLimitKey, { maxRequests: 120, windowMs: 60 * 1000 });

		const input = await readJsonBody(event, (body) => {
			const data = requireObjectBody(body);
			const eventName = data.event;
			if (typeof eventName !== 'string' || !isCanonicalEvent(eventName)) {
				throw new ValidationError(`Invalid or non-canonical analytics event: "${eventName}"`);
			}

			return {
				id: typeof data.id === 'string' ? data.id : undefined,
				distinctId: typeof data.distinctId === 'string' ? data.distinctId : undefined,
				event: eventName as CanonicalEventName,
				properties:
					data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties)
						? (data.properties as Record<string, unknown>)
						: {}
			};
		});

		const user = await event.locals.getUser();
		const distinctId = getOrSetDistinctId(event, input.distinctId);

		const tracked = await getAnalyticsService().track({
			id: input.id,
			distinctId,
			userId: user?.id ?? null,
			event: input.event,
			properties: input.properties
		});

		return jsonOk({ success: true, eventId: tracked.id });
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
