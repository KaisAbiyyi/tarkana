import { error as httpError } from '@sveltejs/kit';
import { AppError } from '$lib/server/errors';
import { DEFAULT_LOCALE, translate, type Locale } from '$lib/i18n';

export function throwPageLoadError(caught: unknown, locale: Locale = DEFAULT_LOCALE): never {
	if (caught instanceof AppError) {
		const message =
			caught.status === 404
				? translate(locale, 'error.notFound')
				: caught.status === 401 || caught.status === 403
					? translate(locale, 'error.accessDenied')
					: caught.status < 500
						? translate(locale, 'error.invalidRequest')
						: translate(locale, 'error.generic');
		httpError(caught.status, message);
	}

	throw caught;
}
