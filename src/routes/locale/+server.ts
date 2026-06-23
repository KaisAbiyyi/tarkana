import { redirect, type RequestHandler } from '@sveltejs/kit';
import { isLocale, LOCALE_COOKIE } from '$lib/i18n';

export const POST: RequestHandler = async ({ cookies, request, url }) => {
	const form = await request.formData();
	const locale = form.get('locale');
	const redirectTo = form.get('redirectTo');

	if (isLocale(locale)) {
		cookies.set(LOCALE_COOKIE, locale, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	redirect(
		303,
		typeof redirectTo === 'string' && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
			? redirectTo
			: '/'
	);
};
