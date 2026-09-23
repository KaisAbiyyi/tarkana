import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { createDailyLeaderboardService } from '$lib/server/leaderboard/daily-leaderboard-service';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { parsePagination } from '$lib/shared/validation/common';

export const GET: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const user = await event.locals.getUser();
		const rateLimitKey = user
			? `user:${user.id}:daily-leaderboard`
			: `ip:${clientIp}:daily-leaderboard`;
		await enforceRateLimit(rateLimitKey, { maxRequests: 60, windowMs: 60 * 1000 });

		const date = event.url.searchParams.get('date') ?? undefined;
		const { limit, offset } = parsePagination(event.url.searchParams, 50);

		const service = createDailyLeaderboardService();
		const result = await service.getLeaderboard(event, { date, limit, offset });

		return jsonOk(result);
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
