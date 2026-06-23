import { chromium, devices } from 'playwright';

(async () => {
	const browser = await chromium.launch();

	const takeScreenshot = async (name, deviceName, viewport) => {
		console.log(`Taking screenshot: ${name}`);
		const context = deviceName
			? await browser.newContext({ ...devices[deviceName] })
			: await browser.newContext({ viewport });

		const page = await context.newPage();
		try {
			await page.goto('http://localhost:5173/challenge');
			await page.waitForTimeout(2000); // Wait for animations and fonts
			await page.screenshot({ path: `screenshot_${name}.png`, fullPage: true });
		} catch (e) {
			console.error(`Error on ${name}:`, e);
		}
		await context.close();
	};

	await takeScreenshot('desktop', null, { width: 1440, height: 900 });
	await takeScreenshot('tablet', 'iPad Mini', null);
	await takeScreenshot('mobile', 'iPhone 13', null);

	await browser.close();
	console.log('Done screenshots!');
})();
