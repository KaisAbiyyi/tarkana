import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAbandonChallengeService } from '$lib/server/sessions/abandon-challenge-service';

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json();
	const result = await createAbandonChallengeService().abandon(event, body);
	return json(result);
};
