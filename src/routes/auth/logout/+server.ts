import { redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
	await event.locals.supabase.auth.signOut();
	redirect(303, '/auth/login');
};
