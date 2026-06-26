import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { loadDatabaseUrl } from '$lib/server/config/env';

export function createDb(databaseUrl = loadDatabaseUrl()) {
	const pool = new pg.Pool({
		connectionString: databaseUrl,
		ssl:
			databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
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
