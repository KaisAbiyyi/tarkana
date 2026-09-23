import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
import { createDuelService } from '$lib/server/duel/duel-service';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { requireUuid } from '$lib/shared/validation/common';

export const POST: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const user = await event.locals.getUser();
		const rateLimitKey = user ? `user:${user.id}:duel-create` : `ip:${clientIp}:duel-create`;
		await enforceRateLimit(rateLimitKey, { maxRequests: 30, windowMs: 60 * 1000 });

		const input = await readJsonBody(event, (body) => {
			const data = requireObjectBody(body);
			return {
				sessionId: requireUuid(data.sessionId, 'sessionId')
			};
		});

		const service = createDuelService();
		const result = await service.createDuel(event, input);

		return jsonOk(result);
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
