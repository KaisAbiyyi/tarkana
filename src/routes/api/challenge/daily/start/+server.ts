import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { createDailyChallengeService } from '$lib/server/challenge/daily-challenge-service';
import { enforceRateLimit } from '$lib/server/security/rate-limit';

export const POST: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const user = await event.locals.getUser();
		const rateLimitKey = user ? `user:${user.id}:daily-start` : `ip:${clientIp}:daily-start`;
		await enforceRateLimit(rateLimitKey, { maxRequests: 20, windowMs: 60 * 1000 });

		const result = await createDailyChallengeService().start(event);
		return jsonOk(result);
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
