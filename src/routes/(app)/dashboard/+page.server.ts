import type { PageServerLoad } from './$types';
import { createDashboardService } from '$lib/server/dashboard/dashboard-service';
import { createActiveChallengeService } from '$lib/server/sessions/active-challenge-service';

export const load: PageServerLoad = async (event) => {
	const [stats, activeChallenge] = await Promise.all([
		createDashboardService().getDashboard(event),
		createActiveChallengeService().getActive(event)
	]);

	return {
		stats,
		activeChallenge
	};
};
