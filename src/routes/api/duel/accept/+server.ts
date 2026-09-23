import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
import { createDuelService } from '$lib/server/duel/duel-service';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { badRequest } from '$lib/server/errors';

export const POST: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const user = await event.locals.getUser();
		const rateLimitKey = user ? `user:${user.id}:duel-accept` : `ip:${clientIp}:duel-accept`;
		await enforceRateLimit(rateLimitKey, { maxRequests: 30, windowMs: 60 * 1000 });

		const input = await readJsonBody(event, (body) => {
			const data = requireObjectBody(body);
			if (!data.publicId || typeof data.publicId !== 'string' || !data.publicId.trim()) {
				throw badRequest('Missing or invalid publicId');
			}
			return {
				publicId: data.publicId.trim()
			};
		});

		const service = createDuelService();
		const result = await service.acceptDuel(event, input.publicId);

		return jsonOk(result);
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
