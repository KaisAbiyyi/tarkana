import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '.playwright-browsers';

const server = await createServer({
	configFile: 'vite.config.ts',
	server: {
		host: '127.0.0.1',
		port: 4173,
		strictPort: true
	}
});

await server.listen();

const cliPath = require.resolve('@playwright/test/cli');
const child = spawn(process.execPath, [cliPath, 'test', ...args], {
	stdio: 'inherit',
	env: {
		...process.env,
		PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH
	}
});

const exitCode = await new Promise((resolve) => {
	child.on('exit', (code) => resolve(code ?? 1));
	child.on('error', () => resolve(1));
});

await server.close();
process.exit(exitCode);
