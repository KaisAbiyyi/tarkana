import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { logger } from '$lib/server/observability/logger';

export const GET: RequestHandler = async () => {
	const timestamp = new Date().toISOString();
	const uptime = Math.round(process.uptime());

	try {
		const db = getDb();
		await db.execute(sql`SELECT 1`);

		return json(
			{
				status: 'ok',
				uptime,
				timestamp,
				services: {
					database: 'healthy'
				}
			},
			{ status: 200 }
		);
	} catch (error) {
		logger.error('Health check database ping failed', error);
		return json(
			{
				status: 'unhealthy',
				uptime,
				timestamp,
				services: {
					database: 'unreachable'
				}
			},
			{ status: 503 }
		);
	}
};
