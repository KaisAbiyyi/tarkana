import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	const code = event.url.searchParams.get('code');
	if (code) await event.locals.supabase.auth.exchangeCodeForSession(code);

	redirect(303, '/dashboard');
};
