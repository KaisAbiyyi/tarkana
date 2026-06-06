import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	const code = event.url.searchParams.get('code');
	if (!code) redirect(303, '/auth/login?error=oauth_callback');

	const { error } = await event.locals.supabase.auth.exchangeCodeForSession(code);
	if (error) redirect(303, '/auth/login?error=oauth_callback');

	redirect(303, '/dashboard');
};
