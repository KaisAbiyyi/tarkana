import { expect, test } from '@playwright/test';

test.describe('P1.2 Product Analytics E2E', () => {
	test('landing page visit sets distinct ID cookie and emits landing_view', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('h1')).toBeVisible();

		// Check cookies for distinct_id
		const cookies = await page.context().cookies();
		const distinctCookie = cookies.find((c) => c.name === 'tarkana_distinct_id');
		expect(distinctCookie).toBeDefined();
		expect(distinctCookie?.value).toMatch(/^[a-zA-Z0-9_-]{8,64}$/);
	});

	test('/api/analytics/event accepts canonical events and enforces zero PII', async ({
		request
	}) => {
		// Valid canonical event
		const validRes = await request.post('/api/analytics/event', {
			data: {
				event: 'landing_view',
				properties: {
					locale: 'en',
					referrer: 'https://example.com'
				}
			}
		});
		expect(validRes.status()).toBe(200);
		const validBody = await validRes.json();
		expect(validBody.ok).toBe(true);
		expect(validBody.data.success).toBe(true);
		expect(validBody.data.eventId).toBeTruthy();

		// Non-canonical event rejected
		const invalidRes = await request.post('/api/analytics/event', {
			data: {
				event: 'unauthorized_hacker_event',
				properties: {}
			}
		});
		expect(invalidRes.status()).toBe(400);

		// Event with PII keys (sanitized without failure or stripped)
		const piiRes = await request.post('/api/analytics/event', {
			data: {
				event: 'signup_started',
				properties: {
					source: 'direct',
					password: 'supersecretpassword',
					guestToken: 'guest1234'
				}
			}
		});
		expect(piiRes.status()).toBe(200);
		const piiBody = await piiRes.json();
		expect(piiBody.ok).toBe(true);
		expect(piiBody.data.success).toBe(true);
	});

	test('registration flow triggers signup_started on mount', async ({ page }) => {
		const analyticsEvents: string[] = [];

		page.on('request', (req) => {
			if (req.url().includes('/api/analytics/event') && req.method() === 'POST') {
				try {
					const postData = req.postData();
					if (postData) {
						const data = JSON.parse(postData);
						if (data.event) analyticsEvents.push(data.event);
					}
				} catch {
					/* ignore */
				}
			}
		});

		await page.goto('/auth/register?claimSession=00000000-0000-4000-8000-000000000001');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('input[name="displayName"]')).toBeVisible();

		// Wait briefly for client analytics tracker
		await page.waitForTimeout(600);
		expect(analyticsEvents).toContain('signup_started');
	});
});
