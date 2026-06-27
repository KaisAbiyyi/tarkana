import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
	console.log('Running production migrations...');
	let databaseUrl =
		process.env.DIRECT_URL ||
		process.env.POSTGRES_URL_NON_POOLING ||
		process.env.DATABASE_URL ||
		process.env.POSTGRES_URL;

	if (!databaseUrl) {
		console.warn('No database connection string is set. Skipping migrations.');
		process.exit(0);
	}

	const getSupabaseProjectRef = () => {
		const candidates = [
			process.env.PUBLIC_SUPABASE_URL,
			process.env.SUPABASE_URL,
			process.env.VITE_SUPABASE_URL,
			process.env.NEXT_PUBLIC_SUPABASE_URL
		];

		for (const candidate of candidates) {
			if (!candidate) continue;

			try {
				const hostname = new URL(candidate).hostname;
				const match = hostname.match(/^([^.]+)\.supabase\.co$/);
				if (match) return match[1];
			} catch {
				const match = candidate.match(/https?:\/\/([^.]+)\.supabase\.co/);
				if (match) return match[1];
			}
		}

		return undefined;
	};

	// Fix missing project ref in username for Supabase pooler URLs.
	try {
		const parsed = new URL(databaseUrl);
		if (parsed.username === 'postgres' && parsed.hostname.includes('pooler.supabase.com')) {
			const projectRef = getSupabaseProjectRef();
			if (projectRef) {
				parsed.username = `postgres.${projectRef}`;
				databaseUrl = parsed.toString();
				console.log('Appended project ref to database username.');
			}
		}
	} catch {}

	// Supabase transaction pooler (6543) does not support DDL statements (migrations).
	// If we detect port 6543, we automatically switch to the session pooler on port 5432.
	if (!process.env.DIRECT_URL && databaseUrl.includes('.pooler.supabase.com:6543')) {
		console.log(
			'Detected Supabase Transaction Pooler (port 6543). Switching to Session Pooler (port 5432) for migrations...'
		);
		databaseUrl = databaseUrl.replace(':6543', ':5432');
	}

	try {
		const parsed = new URL(databaseUrl);
		if (parsed.hostname.includes('pooler.supabase.com') && parsed.username === 'postgres') {
			throw new Error(
				'Supabase pooler URLs require username "postgres.<project-ref>". Set PUBLIC_SUPABASE_URL or DIRECT_URL in Vercel so migrations can authenticate.'
			);
		}
	} catch (err) {
		if (err instanceof TypeError) {
			throw err;
		}

		console.error(err.message);
		process.exit(1);
	}

	// Create a postgres pool
	const pool = new pg.Pool({
		connectionString: databaseUrl,
		ssl:
			databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
				? false
				: { rejectUnauthorized: false }
	});

	const db = drizzle(pool);

	try {
		await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
		console.log('Migrations completed successfully.');
	} catch (err) {
		console.error('Migration failed!', err);
		process.exit(1);
	} finally {
		await pool.end();
	}
}
run();
