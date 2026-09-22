import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function runMaintenance() {
	console.log('[Maintenance] Starting automated database prune routine...');

	const databaseUrl =
		process.env.DIRECT_URL ||
		process.env.POSTGRES_URL_NON_POOLING ||
		process.env.DATABASE_URL ||
		process.env.POSTGRES_URL;

	if (!databaseUrl) {
		console.warn('[Maintenance] No database connection string found. Exiting.');
		process.exit(0);
	}

	const pool = new pg.Pool({
		connectionString: databaseUrl,
		max: 2,
		ssl:
			databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
				? false
				: { rejectUnauthorized: false }
	});

	const client = await pool.connect();

	try {
		// 1. Prune expired rate limits
		console.log('[Maintenance] Pruning expired rate limit records...');
		const rateLimitRes = await client.query(
			`DELETE FROM rate_limits WHERE reset_at < NOW() RETURNING key;`
		);
		console.log(`[Maintenance] Pruned ${rateLimitRes.rowCount} expired rate limit records.`);

		// 2. Prune stale unclaimed guest sessions older than 7 days
		console.log('[Maintenance] Pruning stale guest sessions older than 7 days...');
		const guestRes = await client.query(`
			DELETE FROM challenge_sessions
			WHERE user_id IS NULL
			  AND claimed_at IS NULL
			  AND guest_token IS NOT NULL
			  AND created_at < NOW() - INTERVAL '7 days'
			RETURNING id;
		`);
		console.log(`[Maintenance] Pruned ${guestRes.rowCount} stale guest sessions.`);

		console.log('[Maintenance] Routine completed successfully.');
	} catch (error) {
		console.error('[Maintenance] Routine encountered an error:', error);
		process.exitCode = 1;
	} finally {
		client.release();
		await pool.end();
	}
}

runMaintenance();
