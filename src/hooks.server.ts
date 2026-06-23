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

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace('%lang%', event.locals.locale)
				.replace('%dir%', getTextDirection(event.locals.locale)),
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
