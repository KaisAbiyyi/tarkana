import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseDisplayName } from '$lib/shared/validation/common';
import { translate } from '$lib/i18n';

export const load: PageServerLoad = async (event) => {
	const user = await event.locals.getUser();
	if (user) redirect(303, '/dashboard');
	return {};
};

export const actions = {
	register: async (event) => {
		const t = (key: Parameters<typeof translate>[1]) => translate(event.locals.locale, key);
		const form = await event.request.formData();
		const displayNameInput = String(form.get('displayName') ?? '');
		const emailInput = String(form.get('email') ?? '');
		const email = emailInput.trim();
		const password = String(form.get('password') ?? '');

		const errors: Record<string, string> = {};

		let displayName = '';
		try {
			displayName = parseDisplayName(displayNameInput);
		} catch {
			errors.displayName = t('validation.displayName');
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email) {
			errors.email = t('validation.emailRequired');
		} else if (!emailRegex.test(email)) {
			errors.email = t('validation.emailInvalid');
		}

		if (!password) {
			errors.password = t('validation.passwordRequired');
		} else if (password.length < 8) {
			errors.password = t('validation.passwordLength');
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				displayName: displayNameInput,
				email: emailInput,
				errors
			});
		}

		const { data, error } = await event.locals.supabase.auth.signUp({
			email,
			password,
			options: { data: { full_name: displayName, display_name: displayName } }
		});

		if (error) {
			if (error.status === 422 || error.message.toLowerCase().includes('already registered')) {
				return fail(400, { displayName, email, message: t('auth.emailRegistered'), errors: {} });
			}
			return fail(400, { displayName, email, message: t('auth.requestFailed'), errors: {} });
		}
		if (data.session) redirect(303, '/dashboard');

		return {
			success: true,
			displayName,
			email,
			message: t('auth.confirmEmail')
		};
	},

	google: async (event) => {
		const t = (key: Parameters<typeof translate>[1]) => translate(event.locals.locale, key);
		const { data, error } = await event.locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${event.url.origin}/auth/callback` }
		});

		if (error || !data.url)
			return fail(400, {
				message: t('auth.googleFailed'),
				googleError: true,
				displayName: '',
				email: '',
				errors: {} as Record<string, string>
			});
		redirect(303, data.url);
	}
} satisfies Actions;
