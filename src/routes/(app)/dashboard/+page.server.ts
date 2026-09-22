import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDashboardService } from '$lib/server/dashboard/dashboard-service';
import { createActiveChallengeService } from '$lib/server/sessions/active-challenge-service';

export const load: PageServerLoad = async (event) => {
	const user = await event.locals.getUser();
	if (!user) redirect(303, '/auth/login');
	const [stats, activeChallenge] = await Promise.all([
		createDashboardService().getDashboard(event),
		createActiveChallengeService().getActive(event)
	]);

	return {
		stats,
		activeChallenge
	};
};
