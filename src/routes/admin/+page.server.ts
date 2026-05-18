import type { PageServerLoad } from './$types';
import { createAdminService } from '$lib/server/admin/admin-service';

export const load: PageServerLoad = async (event) => {
	return {
		overview: await createAdminService().getOverview(event)
	};
};
