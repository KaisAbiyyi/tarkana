import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { createRequestAuthAccessors } from '$lib/server/auth/request-auth';
import { loadServerEnv } from '$lib/server/config/env';
import { getTextDirection, LOCALE_COOKIE, resolveLocale } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	const env = loadServerEnv();
	event.locals.locale = resolveLocale(event.cookies.get(LOCALE_COOKIE));

	event.locals.supabase = createServerClient(
		env.PUBLIC_SUPABASE_URL,
		env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
					for (const { name, value, options } of cookiesToSet) {
						try {
							event.cookies.set(name, value, { ...options, path: options.path ?? '/' });
						} catch {
							// Ignored if response is already generated.
							// The session is typically refreshed in server middleware.
						}
					}
				}
			}
		}
	);

	const auth = createRequestAuthAccessors(event.locals.supabase);
	event.locals.getSession = auth.getSession;
	event.locals.getUser = auth.getUser;

	event.locals.profile = null;

	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace('%lang%', event.locals.locale)
				.replace('%dir%', getTextDirection(event.locals.locale)),
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

	// Ensure that Content-Security-Policy does not break SvelteKit scripts.
	// You may need to tune this for external resources if added later.
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:;"
	);

	return response;
};
