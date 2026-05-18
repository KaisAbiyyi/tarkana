import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
import { createProfileService } from '$lib/server/profile/profile-service';

export const GET: RequestHandler = async (event) => {
	try {
		const profileService = createProfileService();
		return jsonOk(await profileService.getProfile(event));
	} catch (error) {
		return jsonError(error);
	}
};

export const PATCH: RequestHandler = async (event) => {
	try {
		const profileService = createProfileService();
		const result = await readJsonBody(event, async (body) => {
			const objectBody = requireObjectBody(body);
			return profileService.updateDisplayName(event, objectBody.displayName);
		});

		return jsonOk(result);
	} catch (error) {
		return jsonError(error);
	}
};
