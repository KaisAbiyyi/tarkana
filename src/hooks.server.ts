import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { loadServerEnv } from '$lib/server/config/env';

export const handle: Handle = async ({ event, resolve }) => {
	const env = loadServerEnv();

	event.locals.supabase = createServerClient(
		env.PUBLIC_SUPABASE_URL,
		env.PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					for (const { name, value, options } of cookiesToSet) {
						event.cookies.set(name, value, { ...options, path: options.path ?? '/' });
					}
				}
			}
		}
	);

	event.locals.getSession = async () => {
		const { data } = await event.locals.supabase.auth.getSession();
		return data.session;
	};

	event.locals.getUser = async () => {
		const { data, error } = await event.locals.supabase.auth.getUser();
		if (error) return null;
		return data.user;
	};

	event.locals.profile = null;

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
