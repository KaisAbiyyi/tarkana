import { promises as fs } from 'fs';
import { join } from 'path';

async function processDir(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (
			entry.name === 'node_modules' ||
			entry.name === '.svelte-kit' ||
			entry.name.startsWith('dashboard-first-run')
		)
			continue;

		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			await processDir(fullPath);
		} else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.svelte'))) {
			let content = await fs.readFile(fullPath, 'utf8');
			if (content.includes('publicDiscriminator') || content.includes('public_discriminator')) {
				const original = content;
				// Remove the lines defining publicDiscriminator
				content = content.replace(/^[ \t]*publicDiscriminator\??:.*$/gm, '');
				content = content.replace(/^[ \t]*public_discriminator.*$/gm, '');
				// Remove passing it as a prop
				content = content.replace(/^[ \t]*publicDiscriminator=\{.*?\}\s*$/gm, '');
				// Remove it from object destructurings and creations
				content = content.replace(/publicDiscriminator:.*?,/g, '');
				content = content.replace(/publicDiscriminator\s*,/g, '');
				content = content.replace(/,\s*publicDiscriminator/g, '');
				// specific for schema.ts
				content = content.replace(
					/publicDiscriminator:[ \t]*varchar\('public_discriminator'.*$/gm,
					''
				);

				// Specific line from auth-provisioning.ts
				content = content.replace(/const publicDiscriminator = Math\.floor[^;]+;\n/s, '');

				if (content !== original) {
					content = content.replace(/\n\n\n/g, '\n\n');
					await fs.writeFile(fullPath, content, 'utf8');
					console.log('Updated', fullPath);
				}
			}
		}
	}
}

processDir('d:/projects/tarkana').catch(console.error);
