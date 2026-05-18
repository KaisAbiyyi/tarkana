import type { PageServerLoad } from './$types';
import { createHistoryService } from '$lib/server/history/history-service';

export const load: PageServerLoad = async (event) => {
	const limit = 20;
	const offset = Number(event.url.searchParams.get('offset') ?? 0);

	return {
		history: await createHistoryService().listHistory(event, { limit, offset })
	};
};
