import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { parsePagination } from '$lib/shared/validation/common';
import { createHistoryService } from '$lib/server/history/history-service';

export const GET: RequestHandler = async (event) => {
	try {
		const historyService = createHistoryService();
		return jsonOk(await historyService.listHistory(event, parsePagination(event.url.searchParams)));
	} catch (error) {
		return jsonError(error);
	}
};
