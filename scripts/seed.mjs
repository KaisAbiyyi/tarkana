import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeed() {
	const databaseUrl =
		process.env.TEST_DATABASE_URL ||
		process.env.DATABASE_URL ||
		process.env.DIRECT_URL ||
		process.env.POSTGRES_URL;

	if (!databaseUrl) {
		console.warn('No database connection string found for seeding. Skipping.');
		return;
	}

	const seedFilePath = path.resolve(__dirname, '../supabase/seed.sql');
	if (!fs.existsSync(seedFilePath)) {
		console.warn('Seed file not found at:', seedFilePath);
		return;
	}

	const seedSql = fs.readFileSync(seedFilePath, 'utf8');

	const pool = new pg.Pool({
		connectionString: databaseUrl,
		ssl:
			databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
				? false
				: { rejectUnauthorized: false }
	});

	let client;
	try {
		client = await pool.connect();
		console.log('Applying database seed from supabase/seed.sql...');
		await client.query(seedSql);
		console.log('Database seed applied successfully.');
	} catch (err) {
		console.error('Error applying database seed:', err.message);
		throw err;
	} finally {
		if (client) client.release();
		await pool.end();
	}
}

// If executed directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	runSeed().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
