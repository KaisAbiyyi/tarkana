import type { PageServerLoad } from './$types';
import { createDailyChallengeService } from '$lib/server/challenge/daily-challenge-service';

export const load: PageServerLoad = async (event) => {
	const user = await event.locals.getUser();
	try {
		const dailyStatus = await createDailyChallengeService().getStatus(event);
		return {
			dailyStatus,
			isGuest: !user
		};
	} catch {
		return {
			dailyStatus: {
				date: new Date().toISOString().slice(0, 10),
				secondsUntilReset: 86400,
				totalQuestions: 10,
				attemptStatus: 'not_started' as const,
				activeSessionId: null,
				isOfficial: true,
				completedAttempt: null
			},
			isGuest: !user
		};
	}
};
