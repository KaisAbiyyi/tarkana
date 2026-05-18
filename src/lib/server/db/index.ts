import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { loadDatabaseUrl } from '$lib/server/config/env';

export function createDb(databaseUrl = loadDatabaseUrl()) {
	const client = postgres(databaseUrl, { prepare: false });
	return drizzle(client, { schema });
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
