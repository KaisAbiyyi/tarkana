import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody } from '$lib/server/api/response';
import { createClaimGuestService } from '$lib/server/sessions/claim-guest-service';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { requireUuid } from '$lib/shared/validation/common';

export const POST: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const user = await event.locals.getUser();
		const rateLimitKey = user
			? `user:${user.id}:challenge-claim`
			: `ip:${clientIp}:challenge-claim`;
		await enforceRateLimit(rateLimitKey, { maxRequests: 20, windowMs: 60 * 1000 });

		const input = await readJsonBody(event, (body) => {
			if (!body || typeof body !== 'object') return {};
			const data = body as Record<string, unknown>;
			return {
				sessionId:
					typeof data.sessionId === 'string' ? requireUuid(data.sessionId, 'sessionId') : undefined
			};
		}).catch(() => ({}));
		return jsonOk(await createClaimGuestService().claim(event, input));
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
