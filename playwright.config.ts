import { defineConfig } from '@playwright/test';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '.playwright-browsers';

export default defineConfig({
	outputDir: '.codex-artifacts/playwright-results',
	use: { baseURL: 'http://127.0.0.1:4173' },
	testMatch: '**/*.e2e.{ts,js}'
});
