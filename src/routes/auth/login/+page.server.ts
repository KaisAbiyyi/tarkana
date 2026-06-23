import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { translate } from '$lib/i18n';

export const load: PageServerLoad = async (event) => {
	const user = await event.locals.getUser();
	if (user) redirect(303, '/dashboard');
	return {};
};

export const actions = {
	login: async (event) => {
		const t = (key: Parameters<typeof translate>[1]) => translate(event.locals.locale, key);
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		const errors: Record<string, string> = {};

		if (!email) {
			errors.email = t('validation.emailRequired');
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = t('validation.emailInvalid');
		}

		if (!password) {
			errors.password = t('validation.passwordRequired');
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, { email, errors });
		}

		const { error } = await event.locals.supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(400, { email, message: t('auth.invalidCredentials') });
		}

		redirect(303, '/dashboard');
	},

	google: async (event) => {
		const t = (key: Parameters<typeof translate>[1]) => translate(event.locals.locale, key);
		const { data, error } = await event.locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${event.url.origin}/auth/callback` }
		});

		if (error || !data.url)
			return fail(400, {
				googleError: true,
				message: t('auth.googleFailed'),
				email: '',
				errors: {} as Record<string, string>
			});
		redirect(303, data.url);
	}
} satisfies Actions;
