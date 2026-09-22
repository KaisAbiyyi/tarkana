import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
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
			const data = requireObjectBody(body);
			return {
				sessionId: requireUuid(data.sessionId, 'sessionId'),
				guestToken: typeof data.guestToken === 'string' ? data.guestToken : undefined
			};
		});
		return jsonOk(await createClaimGuestService().claim(event, input));
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
