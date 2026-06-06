import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

export type RequestAuthAccessors = {
	getSession: () => Promise<Session | null>;
	getUser: () => Promise<User | null>;
};

export function createRequestAuthAccessors(client: SupabaseClient): RequestAuthAccessors {
	let sessionPromise: Promise<Session | null> | null = null;
	let userPromise: Promise<User | null> | null = null;

	return {
		getSession() {
			sessionPromise ??= client.auth.getSession().then(({ data }) => data.session);
			return sessionPromise;
		},
		getUser() {
			userPromise ??= client.auth.getUser().then(({ data, error }) => (error ? null : data.user));
			return userPromise;
		}
	};
}
