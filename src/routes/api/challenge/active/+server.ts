import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createActiveChallengeService } from '$lib/server/sessions/active-challenge-service';

export const GET: RequestHandler = async (event) => {
	const result = await createActiveChallengeService().getActive(event);
	return json(result);
};
