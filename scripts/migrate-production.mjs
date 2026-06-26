import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log('Running production migrations...');
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.warn('DATABASE_URL is not set. Skipping migrations.');
        process.exit(0);
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
