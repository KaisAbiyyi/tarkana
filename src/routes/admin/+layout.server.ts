import { error as httpError, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';
import { translate } from '$lib/i18n';

export const load: LayoutServerLoad = async (event) => {
	try {
		const profile = await requireAdmin(event);
		return { profile };
	} catch (caught) {
		if (caught instanceof AppError && caught.status === 401) {
			redirect(303, '/auth/login');
		}
		if (caught instanceof AppError) {
			httpError(
				caught.status,
				caught.status === 403
					? translate(event.locals.locale, 'error.accessDenied')
					: translate(event.locals.locale, 'error.generic')
			);
		}

		throw caught;
	}
};
