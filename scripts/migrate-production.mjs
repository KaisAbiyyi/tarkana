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

    // Convert Supabase Pooler URL to Direct Connection URL for migrations
    // Migrations (DDL) should always run against the direct database, not the pooler.
    try {
        const parsed = new URL(databaseUrl);
        if (parsed.hostname.includes('pooler.supabase.com')) {
            let projectRef = '';
            
            // Extract project ref from username (e.g., postgres.abcdefg)
            if (parsed.username.includes('.')) {
                projectRef = parsed.username.split('.')[1];
            } 
            // Fallback: extract from PUBLIC_SUPABASE_URL
            else if (process.env.PUBLIC_SUPABASE_URL) {
                const match = process.env.PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
                if (match) {
                    projectRef = match[1];
                }
            }

            if (projectRef) {
                // Construct direct connection URL
                parsed.hostname = `db.${projectRef}.supabase.co`;
                parsed.port = '5432';
                parsed.username = 'postgres'; // Direct connection uses plain 'postgres'
                databaseUrl = parsed.toString();
                console.log(`Converted pooler URL to direct connection for migrations (db.${projectRef}.supabase.co).`);
            } else {
                console.warn('Could not determine Supabase project ref. Migrations might fail on pooler.');
                // Fallback to session pooler if direct connection rewrite is impossible
                if (databaseUrl.includes(':6543')) {
                    databaseUrl = databaseUrl.replace(':6543', ':5432');
                }
            }
        }
    } catch (e) {
        console.error('Failed to parse database URL for rewrite', e);
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
