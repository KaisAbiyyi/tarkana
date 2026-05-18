import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { ProfileSummary } from '$lib/shared/types/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			getSession: () => Promise<Session | null>;
			getUser: () => Promise<User | null>;
			profile: ProfileSummary | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
