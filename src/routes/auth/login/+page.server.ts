import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = await event.locals.getUser();
	if (user) redirect(303, '/dashboard');
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, message: 'Email dan password wajib diisi.' });
		}

		const { error } = await event.locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { email, message: 'Email atau password tidak valid.' });

		redirect(303, '/dashboard');
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
