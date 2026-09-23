import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
import { createShareService } from '$lib/server/share/share-service';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { badRequest } from '$lib/server/errors';

export const POST: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const user = await event.locals.getUser();
		const rateLimitKey = user ? `user:${user.id}:share-revoke` : `ip:${clientIp}:share-revoke`;
		await enforceRateLimit(rateLimitKey, { maxRequests: 20, windowMs: 60 * 1000 });

		const input = await readJsonBody(event, (body) => {
			const data = requireObjectBody(body);
			if (!data.publicId || typeof data.publicId !== 'string') {
				throw badRequest('Missing or invalid publicId');
			}
			return {
				publicId: data.publicId.trim()
			};
		});

		const service = createShareService();
		await service.revokeShare(event, input.publicId);

		return jsonOk({ revoked: true, publicId: input.publicId });
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
