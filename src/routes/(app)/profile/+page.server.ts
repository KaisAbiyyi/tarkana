import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createProfileService } from '$lib/server/profile/profile-service';

import { createSessionRepository } from '$lib/server/db/repositories/session-repository';
import { translate } from '$lib/i18n';

export const load: PageServerLoad = async (event) => {
	const profile = await createProfileService().getProfile(event);
	const user = await event.locals.getUser();
	const stats = await createSessionRepository().getDashboardStats(profile.id);

	return {
		profile,
		user,
		stats: {
			totalCompleted: stats.totalCompleted,
			averageAccuracy: stats.averageAccuracy
		}
	};
};

export const actions: Actions = {
	updateDisplayName: async (event) => {
		const form = await event.request.formData();
		const displayName = form.get('displayName');

		try {
			return {
				profile: await createProfileService().updateDisplayName(event, displayName),
				message: translate(event.locals.locale, 'profile.updated'),
				success: true
			};
		} catch {
			return fail(400, {
				message: translate(event.locals.locale, 'profile.invalidDisplayName'),
				success: false
			});
		}
	}
};
