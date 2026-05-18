import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireProfile } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';

export const load: LayoutServerLoad = async (event) => {
	try {
		const profile = await requireProfile(event);
		return { profile };
	} catch (error) {
		if (error instanceof AppError && error.status === 401) {
			redirect(303, '/auth/login');
		}

		throw error;
	}
};
