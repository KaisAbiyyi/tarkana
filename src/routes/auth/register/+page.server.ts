import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseDisplayName } from '$lib/shared/validation/common';

export const load: PageServerLoad = async (event) => {
	const user = await event.locals.getUser();
	if (user) redirect(303, '/dashboard');
	return {};
};

export const actions: Actions = {
	register: async (event) => {
		const form = await event.request.formData();
		const displayNameInput = String(form.get('displayName') ?? '');
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		let displayName: string;
		try {
			displayName = parseDisplayName(displayNameInput);
		} catch {
			return fail(400, {
				displayName: displayNameInput,
				email,
				message: 'Display name harus 2-32 karakter dan memakai huruf, angka, spasi, _ . atau -.'
			});
		}

		if (!email || password.length < 8) {
			return fail(400, {
				displayName,
				email,
				message: 'Email wajib diisi dan password minimal 8 karakter.'
			});
		}

		const { data, error } = await event.locals.supabase.auth.signUp({
			email,
			password,
			options: { data: { full_name: displayName, display_name: displayName } }
		});

		if (error) return fail(400, { displayName, email, message: 'Akun belum bisa dibuat.' });
		if (data.session) redirect(303, '/dashboard');

		return {
			displayName,
			email,
			message: 'Akun dibuat. Cek email kamu jika Supabase meminta konfirmasi.'
		};
	},

	google: async (event) => {
		const { data, error } = await event.locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${event.url.origin}/auth/callback` }
		});

		if (error || !data.url) return fail(400, { message: 'Google login belum bisa dimulai.' });
		redirect(303, data.url);
	}
};
