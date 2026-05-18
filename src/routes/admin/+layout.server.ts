import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';

export const load: LayoutServerLoad = async (event) => {
	try {
		const profile = await requireAdmin(event);
		return { profile };
	} catch (error) {
		if (error instanceof AppError && error.status === 401) {
			redirect(303, '/auth/login');
		}

		throw error;
	}
};
