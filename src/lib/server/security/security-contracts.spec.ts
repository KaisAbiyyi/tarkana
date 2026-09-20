import { describe, expect, it, beforeEach } from 'vitest';
import { toActiveQuestionDto } from '$lib/server/sessions/dto';
import { createFinishChallengeService } from '$lib/server/sessions/finish-challenge-service';
import { checkRateLimit, enforceRateLimit, resetRateLimitStore } from './rate-limit';
import {
	createChallengeSession,
	createSessionQuestion,
	createSessionAnswer,
	createSessionRepositoryFake
} from '$lib/server/sessions/test-fakes';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';

describe('Security & Reliability Contracts', () => {
	beforeEach(() => {
		resetRateLimitStore();
	});

	describe('P0: Answer Leak Prevention Contract', () => {
		it('ensures active question DTO never leaks correctAnswer or explanation', () => {
			const serverQuestion = createSessionQuestion({
				prompt: 'What comes next in 2, 4, 8, ?',
				choices: ['10', '12', '16', '20'],
				correctAnswer: '16',
				explanation: 'Each term is multiplied by 2.'
			});

			const activeDto = toActiveQuestionDto(serverQuestion);

			// Assert that correctAnswer and explanation are strictly absent
			expect(activeDto).not.toHaveProperty('correctAnswer');
			expect(activeDto).not.toHaveProperty('explanation');
			expect((activeDto as Record<string, unknown>).correctAnswer).toBeUndefined();
			expect((activeDto as Record<string, unknown>).explanation).toBeUndefined();

			// Assert safe presentation fields remain intact
			expect(activeDto.prompt).toBe('What comes next in 2, 4, 8, ?');
			expect(activeDto.choices).toEqual(['10', '12', '16', '20']);
			expect(activeDto.sessionQuestionId).toBe(serverQuestion.id);
		});
	});

	describe('P0: Challenge Completion Idempotency Contract', () => {
		it('returns the existing result idempotently on duplicate finish calls without re-evaluating rating', async () => {
			const profile = createProfile({ rating: 1200, rank: 'Bronze Mind' });
			const completedSession = createChallengeSession({
				userId: profile.id,
				status: 'completed',
				totalQuestions: 1,
				totalScore: 100,
				accuracy: 1,
				ratingBefore: 1200,
				ratingAfter: 1225,
				ratingDelta: 25,
				rankBefore: 'Bronze Mind',
				rankAfter: 'Bronze Mind'
			});
			const question = createSessionQuestion({ sessionId: completedSession.id });
			const answer = createSessionAnswer({
				sessionQuestionId: question.id,
				userId: profile.id,
				isCorrect: true,
				scoreEarned: 100
			});

			const repository = createSessionRepositoryFake({
				session: completedSession,
				questions: [question],
				answers: [answer]
			});

			const service = createFinishChallengeService(
				repository,
				createProfileRepositoryFake(profile)
			);

			const event = createFakeEvent(createFakeUser({ id: profile.id }));

			// First finish call
			const firstResult = await service.finish(event, { sessionId: completedSession.id });

			// Second (replayed/duplicated) finish call
			const secondResult = await service.finish(event, { sessionId: completedSession.id });

			expect(firstResult.sessionId).toBe(completedSession.id);
			expect(secondResult.sessionId).toBe(completedSession.id);
			expect(secondResult.totalScore).toBe(firstResult.totalScore);
			expect(secondResult.ratingDelta).toBe(firstResult.ratingDelta);
			expect(secondResult.ratingAfter).toBe(firstResult.ratingAfter);

			// Ensure completeSession was NOT re-invoked on the repository
			expect(repository.completedSessions).toHaveLength(0);
		});

		it('guarantees exactly one rating mutation under concurrent finish requests', async () => {
			const profile = createProfile({ rating: 1200, rank: 'Bronze Mind' });
			const activeSession = createChallengeSession({
				userId: profile.id,
				status: 'in_progress',
				totalQuestions: 1,
				totalScore: 0,
				accuracy: 0,
				ratingBefore: 1200,
				ratingAfter: 1200,
				ratingDelta: 0,
				rankBefore: 'Bronze Mind',
				rankAfter: 'Bronze Mind'
			});
			const question = createSessionQuestion({ sessionId: activeSession.id });
			const answer = createSessionAnswer({
				sessionQuestionId: question.id,
				userId: profile.id,
				isCorrect: true,
				scoreEarned: 100
			});

			const repository = createSessionRepositoryFake({
				session: activeSession,
				questions: [question],
				answers: [answer]
			});

			const service = createFinishChallengeService(
				repository,
				createProfileRepositoryFake(profile)
			);

			const event = createFakeEvent(createFakeUser({ id: profile.id }));

			// Fire two concurrent finish requests simultaneously
			const [resA, resB] = await Promise.all([
				service.finish(event, { sessionId: activeSession.id }),
				service.finish(event, { sessionId: activeSession.id })
			]);

			expect(resA.sessionId).toBe(activeSession.id);
			expect(resB.sessionId).toBe(activeSession.id);
			expect(resA.totalScore).toBe(resB.totalScore);
			expect(resA.ratingAfter).toBe(resB.ratingAfter);

			// Critical: exactly ONE completion mutation must have occurred
			expect(repository.completedSessions).toHaveLength(1);
		});
	});

	describe('P0: Endpoint Rate Limiting Contract', () => {
		it('allows requests within threshold and blocks with 429 when threshold is exceeded', async () => {
			const key = 'test-user-ip:action';
			const options = { maxRequests: 3, windowMs: 10000 };
			const t0 = 1000000;

			// Request 1: Allowed
			const res1 = await checkRateLimit(key, options, t0);
			expect(res1.allowed).toBe(true);
			expect(res1.remaining).toBe(2);

			// Request 2: Allowed
			const res2 = await checkRateLimit(key, options, t0 + 100);
			expect(res2.allowed).toBe(true);
			expect(res2.remaining).toBe(1);

			// Request 3: Allowed
			const res3 = await checkRateLimit(key, options, t0 + 200);
			expect(res3.allowed).toBe(true);
			expect(res3.remaining).toBe(0);

			// Request 4: Exceeded
			const res4 = await checkRateLimit(key, options, t0 + 300);
			expect(res4.allowed).toBe(false);
			expect(res4.remaining).toBe(0);

			// enforceRateLimit throws AppError with status 429
			await expect(enforceRateLimit(key, options, t0 + 400)).rejects.toThrowError(
				/Rate limit exceeded/
			);
			try {
				await enforceRateLimit(key, options, t0 + 400);
			} catch (err: unknown) {
				expect((err as { status: number }).status).toBe(429);
			}
		});

		it('resets rate limit counter after time window expires', async () => {
			const key = 'test-user-ip:window-reset';
			const options = { maxRequests: 1, windowMs: 500 };
			const t0 = 1000000;

			// First request at t0
			const res1 = await checkRateLimit(key, options, t0);
			expect(res1.allowed).toBe(true);

			// Second request at t0 + 200ms -> Blocked
			const res2 = await checkRateLimit(key, options, t0 + 200);
			expect(res2.allowed).toBe(false);

			// Third request after window expires (t0 + 600ms) -> Allowed again
			const res3 = await checkRateLimit(key, options, t0 + 600);
			expect(res3.allowed).toBe(true);
		});
	});
});
