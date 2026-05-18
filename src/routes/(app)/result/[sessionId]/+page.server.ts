import type { PageServerLoad } from './$types';
import { createFinishChallengeService } from '$lib/server/sessions/finish-challenge-service';

export const load: PageServerLoad = async (event) => {
	return {
		result: await createFinishChallengeService().finish(event, {
			sessionId: event.params.sessionId
		})
	};
};
