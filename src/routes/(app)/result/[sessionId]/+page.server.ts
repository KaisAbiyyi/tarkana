import type { PageServerLoad } from './$types';
import { createFinishChallengeService } from '$lib/server/sessions/finish-challenge-service';
import { throwPageLoadError } from '$lib/server/page-error';

export const load: PageServerLoad = async (event) => {
	try {
		return {
			result: await createFinishChallengeService().finish(event, {
				sessionId: event.params.sessionId
			})
		};
	} catch (caught) {
		throwPageLoadError(caught, event.locals.locale);
	}
};
