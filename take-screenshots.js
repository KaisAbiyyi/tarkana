import { chromium } from 'playwright';

(async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext();
	const page = await context.newPage();

	// Set auth cookie
	await context.addCookies([
		{
			name: 'sb-auth-token',
			value: 'test-token',
			domain: 'localhost',
			path: '/'
		}
	]);

	await page.goto('http://localhost:5175/profile');
	await page.waitForTimeout(2000); // wait for animations

	// Desktop screenshot
	await page.screenshot({ path: 'd:/projects/tarkana/profile-desktop.png', fullPage: true });

	// Mobile screenshot
	await page.setViewportSize({ width: 375, height: 812 });
	await page.screenshot({ path: 'd:/projects/tarkana/profile-mobile.png', fullPage: true });

	await browser.close();
})();
