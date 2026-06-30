import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { loadDatabaseUrl, loadServerEnv } from '$lib/server/config/env';

export function fixSupabaseUrl(url: string, publicUrl?: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.username === 'postgres' && parsed.hostname.includes('pooler.supabase.com')) {
			const pUrl = publicUrl || loadServerEnv().PUBLIC_SUPABASE_URL;
			const match = pUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
			if (match) {
				parsed.username = `postgres.${match[1]}`;
				return parsed.toString();
			}
		}
	} catch (e) {
		// Ignore parse errors
	}
	return url;
}

export function createDb(databaseUrl = loadDatabaseUrl()) {
	const fixedUrl = fixSupabaseUrl(databaseUrl);
	const pool = new pg.Pool({
		connectionString: fixedUrl,
		max: 15,
		idleTimeoutMillis: 10000,
		ssl:
			fixedUrl.includes('localhost') || fixedUrl.includes('127.0.0.1')
				? false
				: { rejectUnauthorized: false }
	});
	return drizzle(pool, { schema });
}

let cachedDb: ReturnType<typeof createDb> | null = null;

export function getDb(): ReturnType<typeof createDb> {
	cachedDb ??= createDb();
	return cachedDb;
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
	get(_target, property, receiver) {
		return Reflect.get(getDb(), property, receiver);
	}
});

export type Database = ReturnType<typeof createDb>;
