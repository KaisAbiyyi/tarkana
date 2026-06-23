import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody } from '$lib/server/api/response';
import { parsePagination } from '$lib/shared/validation/common';
import { createAdminService } from '$lib/server/admin/admin-service';

export const GET: RequestHandler = async (event) => {
	try {
		const adminService = createAdminService();
		return jsonOk(
			await adminService.listCategories(event, parsePagination(event.url.searchParams))
		);
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		const adminService = createAdminService();
		return jsonOk(await readJsonBody(event, (body) => adminService.saveCategory(event, body)));
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
