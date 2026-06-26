import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log('Running production migrations...');
    let databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.warn('DATABASE_URL is not set. Skipping migrations.');
        process.exit(0);
    }

    // Supabase transaction pooler (6543) does not support DDL statements (migrations).
    // If we detect port 6543, we automatically switch to the session pooler on port 5432.
    if (!process.env.DIRECT_URL && databaseUrl.includes('.pooler.supabase.com:6543')) {
        console.log('Detected Supabase Transaction Pooler (port 6543). Switching to Session Pooler (port 5432) for migrations...');
        databaseUrl = databaseUrl.replace(':6543', ':5432');
    }
    
    // Create a postgres pool
    const pool = new pg.Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
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
