import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export type ServerEnv = {
	DATABASE_URL: string;
	PUBLIC_SUPABASE_URL: string;
	PUBLIC_SUPABASE_ANON_KEY: string;
};

function requireEnvValue(source: Record<string, string | undefined>, key: keyof ServerEnv): string {
	const value = source[key];
	if (!value) throw new Error(`${key} is not set`);
	return value;
}

export function loadServerEnv(): ServerEnv {
	return {
		DATABASE_URL: requireEnvValue(privateEnv, 'DATABASE_URL'),
		PUBLIC_SUPABASE_URL: requireEnvValue(publicEnv, 'PUBLIC_SUPABASE_URL'),
		PUBLIC_SUPABASE_ANON_KEY: requireEnvValue(publicEnv, 'PUBLIC_SUPABASE_ANON_KEY')
	};
}

export function loadDatabaseUrl(): string {
	return requireEnvValue(privateEnv, 'DATABASE_URL');
}
