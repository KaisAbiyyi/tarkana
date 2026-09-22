import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { createDailyChallengeService } from '$lib/server/challenge/daily-challenge-service';
import { enforceRateLimit } from '$lib/server/security/rate-limit';

export const GET: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const user = await event.locals.getUser();
		const rateLimitKey = user ? `user:${user.id}:daily-status` : `ip:${clientIp}:daily-status`;
		await enforceRateLimit(rateLimitKey, { maxRequests: 60, windowMs: 60 * 1000 });

		const status = await createDailyChallengeService().getStatus(event);
		return jsonOk(status);
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
