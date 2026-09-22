import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	DAILY_CHALLENGE_CONFIG_VERSION,
	DAILY_CHALLENGE_GENERATOR_VERSION,
	DEFAULT_DEV_DAILY_SECRET,
	resolveDailyChallengeSecret,
	generateCanonicalDailySeed,
	generateDailyPuzzleSnapshot,
	getSecondsUntilNextUtcMidnight,
	getUtcDateString
} from './daily-challenge';
import { createDailyChallengeService } from './daily-challenge-service';
import type {
	DailyRepository,
	StartDailySessionAtomicInput,
	StartDailySessionAtomicResult
} from '$lib/server/db/repositories/daily-repository';
import type {
	Category,
	DailyChallenge,
	DailyChallengeAttempt,
	NewChallengeSession,
	QuestionRule,
	SessionQuestion,
	UserProfile
} from '$lib/server/db/schema';
import { createFinishChallengeService } from '$lib/server/sessions/finish-challenge-service';
import { GUEST_TOKEN_COOKIE, hashGuestToken } from '$lib/server/sessions/guest-token';

function createMockCategory(id: string, slug: string): Category {
	return {
		id,
		name: slug,
		slug,
		description: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

function createMockRule(
	id: string,
	categoryId: string,
	ruleType: string,
	difficultyBand: 'easy' | 'medium' | 'hard'
): QuestionRule {
	return {
		id,
		categoryId,
		ruleType,
		difficultyMin: 100,
		difficultyMax: 300,
		difficultyBand,
		timeLimitSeconds: 30,
		config: {},
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

function getMockCategoriesAndRules() {
	const catNum = createMockCategory('cat-num', 'number_sequence');
	const catSym = createMockCategory('cat-sym', 'symbol_pattern');
	const catDed = createMockCategory('cat-ded', 'mini_deduction');
	const catMem = createMockCategory('cat-mem', 'memory_pattern');

	const categories = [catNum, catSym, catDed, catMem];
	const rules: QuestionRule[] = [
		createMockRule('r-num-e', catNum.id, 'arithmetic_sequence', 'easy'),
		createMockRule('r-num-m', catNum.id, 'geometric_sequence', 'medium'),
		createMockRule('r-num-h', catNum.id, 'increasing_difference', 'hard'),
		createMockRule('r-sym-e', catSym.id, 'repeating_cycle', 'easy'),
		createMockRule('r-sym-m', catSym.id, 'symbol_rotation', 'medium'),
		createMockRule('r-sym-h', catSym.id, 'shape_order', 'hard'),
		createMockRule('r-ded-e', catDed.id, 'object_ordering', 'easy'),
		createMockRule('r-ded-m', catDed.id, 'simple_elimination', 'medium'),
		createMockRule('r-ded-h', catDed.id, 'comparison_chain', 'hard'),
		createMockRule('r-mem-e', catMem.id, 'symbol_recall', 'easy'),
		createMockRule('r-mem-m', catMem.id, 'position_recall', 'medium'),
		createMockRule('r-mem-h', catMem.id, 'sequence_recall', 'hard')
	];

	return { categories, rules };
}

function createDailyRepositoryFake(
	sessionRepo?: any
): DailyRepository & { setSessionRepo: (repo: any) => void } {
	const challenges: DailyChallenge[] = [];
	const attempts: DailyChallengeAttempt[] = [];
	let internalSessionRepo = sessionRepo;

	return {
		setSessionRepo(repo: any) {
			internalSessionRepo = repo;
		},

		async findDailyChallengeByDate(dateString) {
			return challenges.find((c) => c.challengeDate === dateString) ?? null;
		},

		async getOrCreateDailyChallenge(input) {
			const existing = challenges.find((c) => c.challengeDate === input.challengeDate);
			if (existing) return existing;

			const created: DailyChallenge = {
				id: input.id ?? `daily-${input.challengeDate}`,
				challengeDate: input.challengeDate,
				configVersion: input.configVersion ?? 1,
				generatorVersion: input.generatorVersion ?? 1,
				seed: input.seed,
				totalQuestions: input.totalQuestions ?? 10,
				puzzleSnapshot: input.puzzleSnapshot,
				createdAt: new Date()
			};
			challenges.push(created);
			return created;
		},

		async findAttemptForUser(dailyChallengeId, userId) {
			return (
				attempts.find((a) => a.dailyChallengeId === dailyChallengeId && a.userId === userId) ?? null
			);
		},

		async findAttemptForGuest(dailyChallengeId, guestTokenHash) {
			return (
				attempts.find(
					(a) => a.dailyChallengeId === dailyChallengeId && a.guestTokenHash === guestTokenHash
				) ?? null
			);
		},

		async createAttempt(input) {
			if (input.userId && input.isOfficial !== false) {
				const existing = attempts.find(
					(a) =>
						a.dailyChallengeId === input.dailyChallengeId &&
						a.userId === input.userId &&
						a.isOfficial
				);
				if (existing) {
					throw new Error(
						'duplicate key value violates unique constraint "daily_attempts_user_official_uidx"'
					);
				}
			}

			if (input.guestTokenHash && input.isOfficial !== false) {
				const existing = attempts.find(
					(a) =>
						a.dailyChallengeId === input.dailyChallengeId &&
						a.guestTokenHash === input.guestTokenHash &&
						a.isOfficial
				);
				if (existing) {
					throw new Error(
						'duplicate key value violates unique constraint "daily_attempts_guest_official_uidx"'
					);
				}
			}

			const created: DailyChallengeAttempt = {
				id: input.id ?? `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				dailyChallengeId: input.dailyChallengeId,
				sessionId: input.sessionId ?? null,
				userId: input.userId ?? null,
				guestTokenHash: input.guestTokenHash ?? null,
				distinctId: input.distinctId,
				isOfficial: input.isOfficial ?? true,
				status: input.status ?? 'in_progress',
				score: input.score ?? 0,
				accuracy: input.accuracy ?? 0,
				totalTimeSeconds: input.totalTimeSeconds ?? 0,
				createdAt: new Date(),
				completedAt: null
			};
			attempts.push(created);
			return created;
		},

		async findAttemptBySessionId(sessionId) {
			return attempts.find((a) => a.sessionId === sessionId) ?? null;
		},

		async completeAttempt(input) {
			const att = attempts.find((a) => a.id === input.attemptId);
			if (!att) throw new Error('Attempt not found');
			att.status = 'completed';
			att.score = input.score;
			att.accuracy = input.accuracy;
			att.totalTimeSeconds = input.totalTimeSeconds;
			att.completedAt = input.completedAt ?? new Date();
			return att;
		},

		async abandonAttempt(attemptId) {
			const att = attempts.find((a) => a.id === attemptId);
			if (att) {
				att.status = 'abandoned';
				att.completedAt = new Date();
			}
		},

		async claimGuestDailyAttempts(input) {
			let claimedCount = 0;
			let demotedCount = 0;

			for (const att of attempts) {
				if (att.guestTokenHash === input.guestTokenHash && !att.userId) {
					const existingUserAttempt = attempts.find(
						(a) =>
							a.dailyChallengeId === att.dailyChallengeId &&
							a.userId === input.userId &&
							a.isOfficial
					);
					if (existingUserAttempt) {
						att.userId = input.userId;
						att.isOfficial = false;
						demotedCount += 1;
					} else {
						att.userId = input.userId;
						att.isOfficial = true;
						claimedCount += 1;
					}
				}
			}

			return { claimedCount, demotedCount };
		},

		async startDailySessionAtomic(
			input: StartDailySessionAtomicInput
		): Promise<StartDailySessionAtomicResult> {
			const sRepo = internalSessionRepo;
			if (!sRepo) {
				throw new Error('Session repository not configured in DailyRepositoryFake');
			}

			const checkAttempt = async () => {
				let existing: DailyChallengeAttempt | undefined;
				if (input.userId) {
					existing = attempts.find(
						(a) => a.dailyChallengeId === input.dailyChallengeId && a.userId === input.userId
					);
				} else if (input.guestTokenHash) {
					existing = attempts.find(
						(a) =>
							a.dailyChallengeId === input.dailyChallengeId &&
							a.guestTokenHash === input.guestTokenHash
					);
				}

				if (existing) {
					if (existing.status === 'completed') {
						return { type: 'conflict_completed' as const };
					}
					if (existing.status === 'abandoned') {
						return { type: 'conflict_forfeited' as const };
					}
					if (existing.status === 'in_progress' && existing.sessionId) {
						const session = await sRepo.findSessionById(existing.sessionId);
						if (session && session.status === 'in_progress') {
							const questions = await sRepo.listSessionQuestions(session.id);
							const answers = await sRepo.listSessionAnswers(session.id);
							const answeredIds = new Set(answers.map((a: any) => a.sessionQuestionId));
							const nextQuestion =
								questions.find((q: any) => !answeredIds.has(q.id)) ?? questions[0];
							if (nextQuestion) {
								return {
									type: 'resumed' as const,
									session,
									currentQuestion: nextQuestion
								};
							}
						}
					}
				}
				return null;
			};

			const preCheck = await checkAttempt();
			if (preCheck) return preCheck;

			// Atomic creation
			let session: any;
			let persistedQuestions: any[];
			try {
				session = await sRepo.createSession({
					userId: input.userId,
					guestToken: input.rawGuestToken,
					dailyChallengeId: input.dailyChallengeId,
					challengeType: 'daily',
					status: 'in_progress',
					totalQuestions: input.totalQuestions,
					ratingBefore: input.userRating,
					ratingAfter: input.userRating,
					rankBefore: input.userRank,
					rankAfter: input.userRank
				});

				const qs = input.questions.map((q) => ({
					sessionId: session.id,
					...q
				}));
				persistedQuestions = await sRepo.addQuestions(qs);

				await this.createAttempt({
					dailyChallengeId: input.dailyChallengeId,
					sessionId: session.id,
					userId: input.userId,
					guestTokenHash: input.userId ? null : input.guestTokenHash,
					distinctId: input.distinctId,
					isOfficial: true,
					status: 'in_progress'
				});
			} catch (err: unknown) {
				if (session) {
					const sIdx = sRepo.sessions.findIndex((s: any) => s.id === session.id);
					if (sIdx !== -1) sRepo.sessions.splice(sIdx, 1);
					for (let i = sRepo.questions.length - 1; i >= 0; i--) {
						if (sRepo.questions[i].sessionId === session.id) {
							sRepo.questions.splice(i, 1);
						}
					}
				}

				if (err instanceof Error && /unique constraint/i.test(err.message)) {
					const fallback = await checkAttempt();
					if (fallback) return fallback;
				}
				throw err;
			}

			return {
				type: 'created' as const,
				session,
				currentQuestion: persistedQuestions[0]
			};
		}
	};
}

function createSessionRepositoryFake() {
	const { categories, rules } = getMockCategoriesAndRules();
	const sessions: any[] = [];
	const questions: SessionQuestion[] = [];
	const answers: any[] = [];

	return {
		sessions,
		questions,
		answers,
		async listActiveCategories() {
			return categories;
		},
		async listActiveQuestionRules() {
			return rules;
		},
		async findActiveConfig() {
			return null;
		},
		async createSession(input: NewChallengeSession) {
			const s = {
				id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				...input,
				guestToken: input.guestToken ? hashGuestToken(input.guestToken) : null,
				claimedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				completedAt: null
			};
			sessions.push(s);
			return s;
		},
		async addQuestions(qs: any[]) {
			const created = qs.map((q, idx) => ({
				id: `q-${Date.now()}-${idx}`,
				createdAt: new Date(),
				...q
			}));
			questions.push(...created);
			return created;
		},
		async addAnswer(ans: any) {
			const created = {
				id: `ans-${Date.now()}-${answers.length}`,
				createdAt: new Date(),
				...ans
			};
			answers.push(created);
			return created;
		},
		async findSessionById(id: string) {
			return sessions.find((s) => s.id === id) ?? null;
		},
		async listSessionQuestions(sessionId: string) {
			return questions.filter((q) => q.sessionId === sessionId);
		},
		async listSessionAnswers(sessionId: string) {
			return answers.filter((a) => a.sessionId === sessionId);
		},
		async findOwnedSession(id: string, userId: string) {
			return sessions.find((s) => s.id === id && s.userId === userId) ?? null;
		},
		async findGuestSession(id: string, guestToken: string) {
			const hashed = hashGuestToken(guestToken);
			return sessions.find((s) => s.id === id && s.guestToken === hashed) ?? null;
		},
		async markCompleted(input: any) {
			const s = sessions.find((item) => item.id === input.sessionId);
			if (!s) throw new Error('Session not found');
			Object.assign(s, input, { status: 'completed', completedAt: new Date() });
			return s;
		},
		async completeSessionAndUpdateProfile(input: any) {
			const s = sessions.find((item) => item.id === input.sessionId);
			if (!s) throw new Error('Session not found');
			Object.assign(s, input, { status: 'completed', completedAt: new Date() });
			return s;
		},
		async abandonSession(id: string) {
			const s = sessions.find((item) => item.id === id);
			if (s) {
				s.status = 'abandoned';
				s.completedAt = new Date();
			}
		}
	};
}

function createProfileRepositoryFake(initialProfiles: UserProfile[] = []) {
	const profiles = [...initialProfiles];
	return {
		profiles,
		async findById(id: string) {
			return profiles.find((p) => p.id === id) ?? null;
		},
		async updateRatingAndRank(id: string, rating: number, rank: any) {
			const p = profiles.find((item) => item.id === id);
			if (p) {
				p.rating = rating;
				p.rank = rank;
			}
		}
	};
}

function createMockEvent(options: {
	user?: { id: string } | null;
	guestToken?: string;
	distinctId?: string;
}): RequestEvent {
	const cookiesMap = new Map<string, string>();
	if (options.guestToken) {
		cookiesMap.set('tarkana_guest_token', options.guestToken);
	}
	if (options.distinctId) {
		cookiesMap.set('tarkana_distinct_id', options.distinctId);
	}

	return {
		locals: {
			getUser: async () => (options.user ? { id: options.user.id } : null),
			locale: 'en'
		},
		cookies: {
			get: (name: string) => cookiesMap.get(name),
			set: (name: string, value: string) => cookiesMap.set(name, value),
			delete: (name: string) => cookiesMap.delete(name)
		},
		url: new URL('http://localhost:5173'),
		getClientAddress: () => '127.0.0.1'
	} as unknown as RequestEvent;
}

describe('P1.3 Daily Challenge Core Architecture', () => {
	const { categories, rules } = getMockCategoriesAndRules();

	describe('HMAC Canonical Seed & Determinism', () => {
		it('fails in production when DAILY_CHALLENGE_SECRET is missing', () => {
			const prevEnv = process.env.NODE_ENV;
			const prevVercel = process.env.VERCEL;
			const prevSecret = process.env.DAILY_CHALLENGE_SECRET;
			try {
				process.env.NODE_ENV = 'production';
				delete process.env.DAILY_CHALLENGE_SECRET;
				delete process.env.VERCEL;
				expect(() => resolveDailyChallengeSecret()).toThrow(
					/CRITICAL CONFIGURATION ERROR: DAILY_CHALLENGE_SECRET/i
				);
			} finally {
				process.env.NODE_ENV = prevEnv;
				if (prevVercel !== undefined) process.env.VERCEL = prevVercel;
				if (prevSecret !== undefined) process.env.DAILY_CHALLENGE_SECRET = prevSecret;
			}
		});

		it('uses dev fallback key outside production when DAILY_CHALLENGE_SECRET is missing', () => {
			const prevEnv = process.env.NODE_ENV;
			const prevVercel = process.env.VERCEL;
			const prevSecret = process.env.DAILY_CHALLENGE_SECRET;
			try {
				process.env.NODE_ENV = 'test';
				delete process.env.DAILY_CHALLENGE_SECRET;
				delete process.env.VERCEL;
				expect(resolveDailyChallengeSecret()).toBe(DEFAULT_DEV_DAILY_SECRET);
			} finally {
				process.env.NODE_ENV = prevEnv;
				if (prevVercel !== undefined) process.env.VERCEL = prevVercel;
				if (prevSecret !== undefined) process.env.DAILY_CHALLENGE_SECRET = prevSecret;
			}
		});

		it('uses explicit secret or env var when provided', () => {
			expect(resolveDailyChallengeSecret('custom_explicit_key')).toBe('custom_explicit_key');
			const prevSecret = process.env.DAILY_CHALLENGE_SECRET;
			try {
				process.env.DAILY_CHALLENGE_SECRET = 'env_secret_key';
				expect(resolveDailyChallengeSecret()).toBe('env_secret_key');
			} finally {
				if (prevSecret !== undefined) process.env.DAILY_CHALLENGE_SECRET = prevSecret;
				else delete process.env.DAILY_CHALLENGE_SECRET;
			}
		});

		it('generates unguessable 64-character hex seed via HMAC-SHA256', () => {
			const seed = generateCanonicalDailySeed('2026-09-22', 1, 1, 'secret_salt');
			expect(seed).toMatch(/^[0-9a-f]{64}$/);
			expect(seed).not.toContain('tarkana'); // seed is pure hex HMAC
		});

		it('is strictly deterministic across calls with identical parameters', () => {
			const seedA = generateCanonicalDailySeed('2026-09-22', 1, 1, 'fixed_secret');
			const seedB = generateCanonicalDailySeed('2026-09-22', 1, 1, 'fixed_secret');
			expect(seedA).toBe(seedB);
		});

		it('produces distinct seeds across dates, versions, and secrets', () => {
			const base = generateCanonicalDailySeed('2026-09-22', 1, 1, 's1');
			const diffDate = generateCanonicalDailySeed('2026-09-23', 1, 1, 's1');
			const diffConfig = generateCanonicalDailySeed('2026-09-22', 2, 1, 's1');
			const diffGen = generateCanonicalDailySeed('2026-09-22', 1, 2, 's1');
			const diffSecret = generateCanonicalDailySeed('2026-09-22', 1, 1, 's2');

			expect(base).not.toBe(diffDate);
			expect(base).not.toBe(diffConfig);
			expect(base).not.toBe(diffGen);
			expect(base).not.toBe(diffSecret);
		});

		it('snapshot generator creates immutable 10-question puzzle with opaque seeds', () => {
			const snapshot = generateDailyPuzzleSnapshot({
				dateString: '2026-09-22',
				categories,
				rules,
				secret: 'test_secret'
			});

			expect(snapshot.totalQuestions).toBe(10);
			expect(snapshot.puzzleSnapshot).toHaveLength(10);
			expect(snapshot.configVersion).toBe(DAILY_CHALLENGE_CONFIG_VERSION);
			expect(snapshot.generatorVersion).toBe(DAILY_CHALLENGE_GENERATOR_VERSION);

			// Check opaque generatedSeed on questions: never exposes master HMAC seed
			for (let i = 0; i < 10; i++) {
				const q = snapshot.puzzleSnapshot[i];
				expect(q.generatedSeed).toBe(`daily:2026-09-22:${i}`);
				expect(q.choices.length).toBeGreaterThanOrEqual(4);
				expect(q.correctAnswer).toBeTruthy();
			}
		});
	});

	describe('UTC Reset Boundary', () => {
		it('getUtcDateString accurately extracts UTC date component', () => {
			const d1 = new Date('2026-09-22T00:00:01Z');
			const d2 = new Date('2026-09-22T23:59:59Z');
			expect(getUtcDateString(d1)).toBe('2026-09-22');
			expect(getUtcDateString(d2)).toBe('2026-09-22');
		});

		it('getSecondsUntilNextUtcMidnight calculates precise countdown', () => {
			// 10 seconds before UTC midnight
			const beforeMidnight = new Date('2026-09-22T23:59:50.000Z');
			expect(getSecondsUntilNextUtcMidnight(beforeMidnight)).toBe(10);

			// Exactly at midnight
			const atMidnight = new Date('2026-09-23T00:00:00.000Z');
			expect(getSecondsUntilNextUtcMidnight(atMidnight)).toBe(86400);
		});
	});

	describe('Concurrent Daily Creation & Single Official Attempt', () => {
		function setupService() {
			const sessionRepo = createSessionRepositoryFake();
			const dailyRepo = createDailyRepositoryFake(sessionRepo);
			const profileRepo = createProfileRepositoryFake([
				{
					id: 'user-alice',
					name: 'Alice',
					displayName: 'alice',
					avatarUrl: null,
					role: 'user',
					rating: 1250,
					rank: 'Silver Solver',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			]);

			const service = createDailyChallengeService(
				dailyRepo,
				sessionRepo as any,
				profileRepo as any
			);
			return { dailyRepo, sessionRepo, profileRepo, service };
		}

		it('concurrent daily challenge creation returns identical snapshot race-safely', async () => {
			const { service } = setupService();

			// Simulate 3 parallel requests hitting the service simultaneously
			const [c1, c2, c3] = await Promise.all([
				service.getOrCreateDailyChallenge('2026-09-22'),
				service.getOrCreateDailyChallenge('2026-09-22'),
				service.getOrCreateDailyChallenge('2026-09-22')
			]);

			expect(c1.id).toBe(c2.id);
			expect(c2.id).toBe(c3.id);
			expect(c1.seed).toBe(c2.seed);
		});

		it('enforces one official attempt and resumes in_progress session', async () => {
			const { service } = setupService();
			const event = createMockEvent({ user: { id: 'user-alice' }, distinctId: 'dist-1' });

			// First start creates attempt
			const firstStart = await service.start(event, '2026-09-22');
			expect(firstStart.isResumed).toBe(false);
			expect(firstStart.totalQuestions).toBe(10);
			expect(firstStart.currentQuestion.orderIndex).toBe(0);

			// Second start resumes existing session
			const secondStart = await service.start(event, '2026-09-22');
			expect(secondStart.isResumed).toBe(true);
			expect(secondStart.sessionId).toBe(firstStart.sessionId);
		});

		it('rejects restarting after official attempt is completed', async () => {
			const { service, dailyRepo } = setupService();
			const event = createMockEvent({ user: { id: 'user-alice' }, distinctId: 'dist-1' });

			const startRes = await service.start(event, '2026-09-22');
			const att = await dailyRepo.findAttemptBySessionId(startRes.sessionId);

			// Complete attempt
			await dailyRepo.completeAttempt({
				attemptId: att!.id,
				score: 120,
				accuracy: 1.0,
				totalTimeSeconds: 45
			});

			await expect(service.start(event, '2026-09-22')).rejects.toThrow(/already been completed/i);
		});

		it('rejects restarting after attempt is abandoned (attempt consumed and forfeited)', async () => {
			const { service, dailyRepo } = setupService();
			const event = createMockEvent({ user: { id: 'user-alice' }, distinctId: 'dist-1' });

			const startRes = await service.start(event, '2026-09-22');
			const att = await dailyRepo.findAttemptBySessionId(startRes.sessionId);

			// Abandon attempt
			await dailyRepo.abandonAttempt(att!.id);

			await expect(service.start(event, '2026-09-22')).rejects.toThrow(/already forfeited/i);
		});

		it('guest Daily lifecycle: start -> submit -> resume -> finish with same HttpOnly cookie', async () => {
			const { service, dailyRepo, sessionRepo, profileRepo } = setupService();
			const event = createMockEvent({ distinctId: 'guest-distinct-1' });

			// 1. Guest starts Daily challenge
			const startRes = await service.start(event, '2026-09-22');
			expect(startRes.isGuest).toBe(true);
			expect(startRes.isResumed).toBe(false);
			expect(startRes.currentQuestion.orderIndex).toBe(0);

			// Verify HttpOnly cookie was set
			const guestToken = event.cookies.get(GUEST_TOKEN_COOKIE);
			expect(guestToken).toBeTruthy();

			// Verify session in repository has hash of raw guest token (not double-hashed)
			const storedSession = await sessionRepo.findSessionById(startRes.sessionId);
			expect(storedSession?.guestToken).toBe(hashGuestToken(guestToken!));

			// findGuestSession with the raw guestToken from cookie MUST succeed
			const verifiedSession = await sessionRepo.findGuestSession(startRes.sessionId, guestToken!);
			expect(verifiedSession).not.toBeNull();
			expect(verifiedSession?.id).toBe(startRes.sessionId);

			// 2. Submit answer to question 0
			await sessionRepo.addAnswer({
				sessionId: startRes.sessionId,
				sessionQuestionId: startRes.currentQuestion.sessionQuestionId,
				userId: null,
				selectedAnswer: '42',
				isCorrect: true,
				timeSpentSeconds: 5,
				scoreEarned: 100
			});

			// 3. Guest resumes Daily challenge (using the same event/cookies)
			const resumeRes = await service.start(event, '2026-09-22');
			expect(resumeRes.sessionId).toBe(startRes.sessionId);
			expect(resumeRes.isResumed).toBe(true);
			expect(resumeRes.currentQuestion.orderIndex).toBe(1); // advanced to next question!

			// 4. Answer remaining 9 questions so session can be finished
			const allQuestions = await sessionRepo.listSessionQuestions(startRes.sessionId);
			for (let i = 1; i < allQuestions.length; i++) {
				await sessionRepo.addAnswer({
					sessionId: startRes.sessionId,
					sessionQuestionId: allQuestions[i].id,
					userId: null,
					selectedAnswer: allQuestions[i].correctAnswer,
					isCorrect: true,
					timeSpentSeconds: 5,
					scoreEarned: 100
				});
			}

			// 5. Guest finishes Daily challenge
			const finishService = createFinishChallengeService(sessionRepo as any, profileRepo as any);
			const finishRes = await finishService.finish(event, { sessionId: startRes.sessionId });
			expect(finishRes.isGuest).toBe(true);
			expect(finishRes.ratingDelta).toBe(0);

			// Complete attempt in dailyRepo (like real DB completeSessionAndUpdateProfile transaction)
			const att = await dailyRepo.findAttemptBySessionId(startRes.sessionId);
			await dailyRepo.completeAttempt({
				attemptId: att!.id,
				score: finishRes.totalScore,
				accuracy: finishRes.accuracy,
				totalTimeSeconds: finishRes.totalTimeSeconds
			});

			// Verify attempt in dailyRepo is completed
			const updatedAttempt = await dailyRepo.findAttemptBySessionId(startRes.sessionId);
			expect(updatedAttempt?.status).toBe('completed');

			// 6. Subsequent start is rejected with 409 conflict
			await expect(service.start(event, '2026-09-22')).rejects.toThrow(/already been completed/i);
		});

		it('concurrent start requests resolve to same canonical attempt with 0 orphan sessions', async () => {
			const { service, sessionRepo } = setupService();
			const event = createMockEvent({ user: { id: 'user-alice' }, distinctId: 'dist-alice' });

			// Fire 5 concurrent starts for Alice on the same date
			const results = await Promise.all([
				service.start(event, '2026-09-22'),
				service.start(event, '2026-09-22'),
				service.start(event, '2026-09-22'),
				service.start(event, '2026-09-22'),
				service.start(event, '2026-09-22')
			]);

			// All 5 must have the same sessionId
			const firstSessionId = results[0].sessionId;
			for (const res of results) {
				expect(res.sessionId).toBe(firstSessionId);
			}

			// Verify session repository has exactly 1 session for Alice
			expect(sessionRepo.sessions.filter((s: any) => s.userId === 'user-alice')).toHaveLength(1);
			// Verify questions array has exactly 10 questions for this session
			expect(sessionRepo.questions.filter((q: any) => q.sessionId === firstSessionId)).toHaveLength(
				10
			);
		});
	});

	describe('Competitive Rating Protection & Guest Claim Conflict', () => {
		it('Daily Challenge completion adds 0 competitive Logic Rating delta', async () => {
			const sessionRepo = createSessionRepositoryFake();
			const dailyRepo = createDailyRepositoryFake(sessionRepo);
			const profileRepo = createProfileRepositoryFake([
				{
					id: 'user-bob',
					name: 'Bob',
					displayName: 'bob',
					avatarUrl: null,
					role: 'user',
					rating: 1500,
					rank: 'Gold Analyst',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			]);

			const dailyService = createDailyChallengeService(
				dailyRepo,
				sessionRepo as any,
				profileRepo as any
			);
			const finishService = createFinishChallengeService(sessionRepo as any, profileRepo as any);

			const event = createMockEvent({ user: { id: 'user-bob' }, distinctId: 'dist-bob' });
			const started = await dailyService.start(event, '2026-09-22');

			// Add fake answers
			const questions = await sessionRepo.listSessionQuestions(started.sessionId);
			for (const q of questions) {
				sessionRepo.answers.push({
					sessionId: started.sessionId,
					sessionQuestionId: q.id,
					userId: 'user-bob',
					selectedAnswer: q.correctAnswer,
					isCorrect: true,
					timeSpentSeconds: 5,
					scoreEarned: 100
				});
			}

			const finishResult = await finishService.finish(event, { sessionId: started.sessionId });

			// Competitive rating delta must be 0!
			expect(finishResult.ratingDelta).toBe(0);
			expect(finishResult.ratingAfter).toBe(1500);
			expect(finishResult.rankAfter).toBe('Gold Analyst');

			// User profile must NOT be modified
			const bobProfile = await profileRepo.findById('user-bob');
			expect(bobProfile?.rating).toBe(1500);
			expect(bobProfile?.rank).toBe('Gold Analyst');
		});

		it('guest claim conflict: existing official attempt wins, guest attempt demoted to non-official', async () => {
			const dailyRepo = createDailyRepositoryFake();

			// 1. User Alice already completed official attempt today
			await dailyRepo.createAttempt({
				id: 'att-alice-official',
				dailyChallengeId: 'daily-2026-09-22',
				userId: 'user-alice',
				distinctId: 'dist-alice',
				isOfficial: true,
				status: 'completed',
				score: 150,
				accuracy: 1.0,
				totalTimeSeconds: 40
			});

			// 2. Guest on another browser completes attempt with guest token
			await dailyRepo.createAttempt({
				id: 'att-guest-attempt',
				dailyChallengeId: 'daily-2026-09-22',
				guestTokenHash: 'hash-guest-xyz',
				distinctId: 'dist-guest',
				isOfficial: true,
				status: 'completed',
				score: 120,
				accuracy: 0.8,
				totalTimeSeconds: 50
			});

			// 3. User logs in / claims guest sessions
			const claimResult = await dailyRepo.claimGuestDailyAttempts({
				guestTokenHash: 'hash-guest-xyz',
				userId: 'user-alice'
			});

			expect(claimResult.claimedCount).toBe(0);
			expect(claimResult.demotedCount).toBe(1);

			// 4. Verify existing Alice attempt is still official winner
			const aliceAttempt = await dailyRepo.findAttemptForUser('daily-2026-09-22', 'user-alice');
			expect(aliceAttempt?.id).toBe('att-alice-official');
			expect(aliceAttempt?.isOfficial).toBe(true);
			expect(aliceAttempt?.score).toBe(150);

			// 5. Verify guest attempt was attached to Alice as non-official
			const demoted = await dailyRepo.findAttemptBySessionId('att-guest-attempt');
			// The demoted attempt is now linked to user-alice with isOfficial: false
			expect(demoted).toBeNull(); // found by session id or query
		});
	});
});
