import type { PageServerLoad } from './$types';
import { createAdminService } from '$lib/server/admin/admin-service';

export const load: PageServerLoad = async (event) => {
	return {
		sessions: await createAdminService().listSessions(event, { limit: 100, offset: 0 })
	};
};
