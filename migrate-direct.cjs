const postgres = require('postgres');

const directUrl =
	'postgresql://postgres.nlhqorniufcdbyzuoqgq:syJYNv9ep6027cfU@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

console.log('Using URL:', directUrl.slice(0, 40) + '...');

const sql = postgres(directUrl, { prepare: false });

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
