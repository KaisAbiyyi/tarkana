import { redirect, type RequestHandler } from '@sveltejs/kit';
import { tryClaimGuestSessionOnAuth } from '$lib/server/sessions/auth-guest-claim';

export const GET: RequestHandler = async (event) => {
	const code = event.url.searchParams.get('code');
	if (!code) redirect(303, '/auth/login?error=oauth_callback');

	const { error } = await event.locals.supabase.auth.exchangeCodeForSession(code);
	if (error) redirect(303, '/auth/login?error=oauth_callback');

	const user = await event.locals.getUser();
	let redirectUrl = '/dashboard';
	if (user) {
		const claimSession = event.url.searchParams.get('claimSession');
		const claimedId = await tryClaimGuestSessionOnAuth(event, user, claimSession);
		if (claimedId) redirectUrl = `/result/${claimedId}`;
	}

	redirect(303, redirectUrl);
};
