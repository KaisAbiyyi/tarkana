import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { createAdminService } from '$lib/server/admin/admin-service';

export const GET: RequestHandler = async (event) => {
	try {
		return jsonOk(await createAdminService().getOverview(event));
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
