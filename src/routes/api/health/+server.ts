import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { logger } from '$lib/server/observability/logger';

const APP_VERSION = '0.1.0-beta.2';

export const GET: RequestHandler = async () => {
	const timestamp = new Date().toISOString();

	try {
		const db = getDb();
		await db.execute(sql`SELECT 1`);

		return json(
			{
				status: 'ok',
				database: 'reachable',
				version: APP_VERSION,
				timestamp
			},
			{ status: 200 }
		);
	} catch (error) {
		logger.error('Health check database ping failed', error);
		return json(
			{
				status: 'error',
				database: 'unreachable',
				version: APP_VERSION,
				timestamp
			},
			{ status: 503 }
		);
	}
};
