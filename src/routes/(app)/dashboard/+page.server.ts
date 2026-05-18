import type { PageServerLoad } from './$types';
import { createDashboardService } from '$lib/server/dashboard/dashboard-service';

export const load: PageServerLoad = async (event) => {
	return {
		stats: await createDashboardService().getDashboard(event)
	};
};
