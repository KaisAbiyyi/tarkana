import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { createRequestAuthAccessors } from '$lib/server/auth/request-auth';
import { loadServerEnv } from '$lib/server/config/env';

export const handle: Handle = async ({ event, resolve }) => {
	const env = loadServerEnv();

	event.locals.supabase = createServerClient(
		env.PUBLIC_SUPABASE_URL,
		env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
					for (const { name, value, options } of cookiesToSet) {
						event.cookies.set(name, value, { ...options, path: options.path ?? '/' });
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
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
