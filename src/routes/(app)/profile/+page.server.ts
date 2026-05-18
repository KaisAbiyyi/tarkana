import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createProfileService } from '$lib/server/profile/profile-service';

export const load: PageServerLoad = async (event) => {
	return {
		profile: await createProfileService().getProfile(event),
		user: await event.locals.getUser()
	};
};

export const actions: Actions = {
	updateDisplayName: async (event) => {
		const form = await event.request.formData();
		const displayName = form.get('displayName');

		try {
			return {
				profile: await createProfileService().updateDisplayName(event, displayName),
				message: 'Display name updated.'
			};
		} catch {
			return fail(400, {
				message: 'Display name harus 2-32 karakter dan memakai huruf, angka, spasi, _ . atau -.'
			});
		}
	}
};
