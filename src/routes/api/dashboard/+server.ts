import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { createDashboardService } from '$lib/server/dashboard/dashboard-service';

export const GET: RequestHandler = async (event) => {
	try {
		const dashboardService = createDashboardService();
		return jsonOk(await dashboardService.getDashboard(event));
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
