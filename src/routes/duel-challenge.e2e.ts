import { expect, test } from '@playwright/test';

test.describe('P1.6 Challenge-a-Friend Asynchronous Duels E2E', () => {
	test('complete challenge -> create duel -> blind invitation secrecy -> participant solves -> head-to-head comparison', async ({
		playwright,
		page
	}) => {
		// 1. Player A: Create isolated guest context
		const playerAContext = await playwright.request.newContext({
			baseURL: 'http://127.0.0.1:4173'
		});

		try {
			// 2. Player A starts a quick challenge
			const startRes = await playerAContext.post('/api/challenge/start', {
				data: { challengeType: 'quick' }
			});
			expect(startRes.status()).toBe(200);
			const startBody = await startRes.json();
			expect(startBody.ok).toBe(true);
			const sessionIdA = startBody.data.sessionId;
			let currentQuestion = startBody.data.currentQuestion;

			// Incomplete session cannot create a duel
			const prematureDuel = await playerAContext.post('/api/duel/create', {
				data: { sessionId: sessionIdA }
			});
			expect(prematureDuel.status()).toBe(400);

			// 3. Player A answers all questions
			const totalQuestions = startBody.data.totalQuestions;
			for (let i = 0; i < totalQuestions; i++) {
				expect(currentQuestion).toBeDefined();
				const submitRes = await playerAContext.post('/api/challenge/submit', {
					data: {
						sessionId: sessionIdA,
						sessionQuestionId: currentQuestion.sessionQuestionId,
						selectedAnswer: currentQuestion.choices[0],
						timeSpentSeconds: 2
					}
				});
				expect(submitRes.status()).toBe(200);
				const submitBody = await submitRes.json();
				currentQuestion = submitBody.data.nextQuestion;
			}

			// 4. Player A finishes the challenge
			const finishRes = await playerAContext.post('/api/challenge/finish', {
				data: { sessionId: sessionIdA }
			});
			expect(finishRes.status()).toBe(200);
			const finishBody = await finishRes.json();
			expect(finishBody.ok).toBe(true);

			// 5. Player A creates a duel invite
			const duelCreateRes = await playerAContext.post('/api/duel/create', {
				data: { sessionId: sessionIdA }
			});
			expect(duelCreateRes.status()).toBe(200);
			const duelCreateBody = await duelCreateRes.json();
			expect(duelCreateBody.ok).toBe(true);
			const publicId = duelCreateBody.data.publicId;
			expect(publicId).toMatch(/^chf_[a-zA-Z0-9_-]+$/);

			// Idempotency: creating again returns the same publicId
			const duelCreateRes2 = await playerAContext.post('/api/duel/create', {
				data: { sessionId: sessionIdA }
			});
			expect(duelCreateRes2.status()).toBe(200);
			const duelCreateBody2 = await duelCreateRes2.json();
			expect(duelCreateBody2.data.publicId).toBe(publicId);

			// Creator cannot accept their own duel
			const selfAcceptRes = await playerAContext.post('/api/duel/accept', {
				data: { publicId }
			});
			expect(selfAcceptRes.status()).toBe(403);

			// 6. Verify Blind Duel OpenGraph PNG endpoint
			const ogRes = await playerAContext.get(`/api/og/duel/${publicId}.png`);
			expect(ogRes.status()).toBe(200);
			expect(ogRes.headers()['content-type']).toBe('image/png');
			expect(ogRes.headers()['cache-control']).toContain('public');

			const pngBuffer = await ogRes.body();
			// Assert PNG signature magic bytes: 0x89 0x50 0x4E 0x47
			expect(pngBuffer[0]).toBe(0x89);
			expect(pngBuffer[1]).toBe(0x50);
			expect(pngBuffer[2]).toBe(0x4e);
			expect(pngBuffer[3]).toBe(0x47);

			// 7. Player B: New isolated context visits the public duel landing page
			const playerBContext = await playwright.request.newContext({
				baseURL: 'http://127.0.0.1:4173'
			});

			const playerBStorage = await playerBContext.storageState();
			await page.context().addCookies(playerBStorage.cookies);
			await page.goto(`/duel/${publicId}`);
			await page.waitForLoadState('networkidle');

			// Blind Secrecy: Challenger's score, accuracy, and total time MUST NOT be visible
			const pageText = await page.innerText('body');
			expect(pageText).toContain('Blind Duel');
			expect(pageText).not.toContain('Reasoning Score');

			// Accept CTA button must be visible
			const acceptBtn = page.getByRole('button', {
				name: /Accept Duel|Terima Duel|Aceptar duelo/i
			});
			await expect(acceptBtn).toBeVisible();

			// 8. Player B accepts duel via API (or UI)
			const acceptRes = await playerBContext.post('/api/duel/accept', {
				data: { publicId }
			});
			expect(acceptRes.status()).toBe(200);
			const acceptBody = await acceptRes.json();
			expect(acceptBody.ok).toBe(true);
			const sessionIdB = acceptBody.data.sessionId;

			// Re-accepting returns the existing session (no replay farming)
			const reacceptRes = await playerBContext.post('/api/duel/accept', {
				data: { publicId }
			});
			expect(reacceptRes.status()).toBe(200);
			const reacceptBody = await reacceptRes.json();
			expect(reacceptBody.data.sessionId).toBe(sessionIdB);

			// 9. Player B answers all questions in the duel
			let currentQuestionB = acceptBody.data.currentQuestion;
			for (let i = 0; i < totalQuestions; i++) {
				expect(currentQuestionB).toBeDefined();
				const submitRes = await playerBContext.post('/api/challenge/submit', {
					data: {
						sessionId: sessionIdB,
						sessionQuestionId: currentQuestionB.sessionQuestionId,
						selectedAnswer: currentQuestionB.choices[0],
						timeSpentSeconds: 1
					}
				});
				expect(submitRes.status()).toBe(200);
				const submitBody = await submitRes.json();
				currentQuestionB = submitBody.data.nextQuestion;
			}

			// 10. Player B finishes the duel session
			const finishResB = await playerBContext.post('/api/challenge/finish', {
				data: { sessionId: sessionIdB }
			});
			expect(finishResB.status()).toBe(200);
			const finishBodyB = await finishResB.json();
			expect(finishBodyB.ok).toBe(true);
			// Duel completion returns duelPublicId and 0 rating delta
			expect(finishBodyB.data.duelPublicId).toBe(publicId);
			expect(finishBodyB.data.ratingDelta).toBe(0);

			// 11. Player B loads the completed duel comparison page
			const playerBCookies = (await playerBContext.storageState()).cookies;
			await page.context().addCookies(playerBCookies);
			await page.goto(`/duel/${publicId}`);
			await page.waitForLoadState('networkidle');

			// Now head-to-head comparison is revealed!
			const comparisonHeader = page.getByText(/Head-to-Head|Hasil Duel|Resultados del duelo/i);
			await expect(comparisonHeader).toBeVisible();

			// Both Challenger and Participant cards are present
			const challengerCard = page.getByText(/Challenger:/i);
			await expect(challengerCard).toBeVisible();

			const yourResultCard = page.getByText(/Your Result:/i);
			await expect(yourResultCard).toBeVisible();

			// Standings table is present
			const standingsTitle = page.getByText(/Standings|Klasemen|Clasificación/i);
			await expect(standingsTitle).toBeVisible();
		} finally {
			await playerAContext.dispose();
		}
	});
});
