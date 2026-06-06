import { error as httpError, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireProfile } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';

export const load: LayoutServerLoad = async (event) => {
	try {
		const profile = await requireProfile(event);
		return { profile };
	} catch (caught) {
		if (caught instanceof AppError && caught.status === 401) {
			redirect(303, '/auth/login');
		}
		if (caught instanceof AppError) {
			httpError(caught.status, caught.status < 500 ? caught.message : 'Something went wrong');
		}

		throw caught;
	}
};
