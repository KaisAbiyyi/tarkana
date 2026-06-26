const fs = require('fs');
const postgres = require('postgres');
const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
const dbUrlLine = lines.find((line) => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].replace(/"/g, '').trim();

console.log('Using URL:', dbUrl.slice(0, 40) + '...');

const sql = postgres(dbUrl, { prepare: false });

async function run() {
	try {
		console.log('Running ALTER TABLE...');
		await sql.unsafe('ALTER TABLE users_profile DROP COLUMN IF EXISTS public_discriminator;');
		console.log('SUCCESS!');
	} catch (e) {
		console.error('ERROR:', e);
	}
	process.exit();
}
run();
