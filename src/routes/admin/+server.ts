import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { createAdminService } from '$lib/server/admin/admin-service';

export const GET: RequestHandler = async (event) => {
	try {
		const adminService = createAdminService();
		return jsonOk(await adminService.getOverview(event));
	} catch (error) {
		return jsonError(error);
	}
};
