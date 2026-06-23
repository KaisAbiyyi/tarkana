import type { PageServerLoad } from './$types';
import { QUESTION_TYPES } from '$lib/shared/constants/challenge';
import { createActiveChallengeService } from '$lib/server/sessions/active-challenge-service';

export const load: PageServerLoad = async (event) => {
	const activeChallenge = await createActiveChallengeService().getActive(event);

	return {
		questionTypes: QUESTION_TYPES,
		activeChallenge
	};
};
