import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createHistoryService } from '$lib/server/history/history-service';

export const load: PageServerLoad = async (event) => {
	const user = await event.locals.getUser();
	if (!user) redirect(303, '/auth/login');
	const limit = 20;
	const offset = Number(event.url.searchParams.get('offset') ?? 0);
	const filter = event.url.searchParams.get('filter') ?? 'all';

	const history = await createHistoryService().listHistory(event, { limit, offset, filter });

	return {
		history,
		filter
	};
};
