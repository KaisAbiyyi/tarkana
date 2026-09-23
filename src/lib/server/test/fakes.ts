import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
import type { ProfileSummary } from '$lib/shared/types/auth';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';
import type { NewSessionQuestion, UserProfile } from '$lib/server/db/schema';
import type { RankName } from '$lib/shared/constants/rank';

export function createFakeUser(overrides: Partial<User> = {}): User {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		app_metadata: {},
		user_metadata: {},
		aud: 'authenticated',
		created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
		email: 'player@example.com',
		...overrides
	} as User;
}

export function createFakeEvent(
	user: User | null,
	initialCookies: Record<string, string> = {}
): RequestEvent {
	const cookieJar = new Map<string, string>(Object.entries(initialCookies));
	return {
		locals: {
			getUser: async () => user,
			getSession: async () => null,
			profile: null
		},
		url: new URL('http://localhost:5173/'),
		cookies: {
			get: (name: string) => cookieJar.get(name),
			set: (name: string, value: string) => {
				cookieJar.set(name, value);
			},
			delete: (name: string) => {
				cookieJar.delete(name);
			},
			getAll: () => Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value }))
		}
	} as unknown as RequestEvent;
}

export function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
	const now = new Date('2026-01-01T00:00:00.000Z');

	return {
		id: '11111111-1111-4111-8111-111111111111',
		name: 'John Doe',
		displayName: 'johndoe',
		avatarUrl: null,

		role: 'user',
		rating: 0,
		rank: 'Unranked',
		createdAt: now,
		updatedAt: now,
		...overrides
	};
}

export function createProfileRepositoryFake(
	initialProfile: UserProfile | null = createProfile()
): ProfileRepository & { createdProfiles: UserProfile[]; updatedDisplayNames: string[] } {
	let profile = initialProfile;
	const createdProfiles: UserProfile[] = [];
	const updatedDisplayNames: string[] = [];

	return {
		createdProfiles,
		updatedDisplayNames,
		async findById(id?: string) {
			if (!profile) return null;
			if (id && profile.id !== id) {
				const created = createdProfiles.find((p) => p.id === id);
				return created ?? null;
			}
			return profile;
		},
		async create(input) {
			const created = createProfile(input);
			profile = created;
			createdProfiles.push(created);
			return created;
		},
		async updateDisplayName(_userId, displayName) {
			if (!profile) throw new Error('No profile');
			updatedDisplayNames.push(displayName);
			profile = { ...profile, displayName };
			return profile;
		},
		async updateRatingAndRank(input) {
			if (!profile) throw new Error('No profile');
			profile = { ...profile, rating: input.rating, rank: input.rank };
			return profile;
		}
	};
}

export function toProfileSummary(profile: UserProfile): ProfileSummary {
	return {
		id: profile.id,
		displayName: profile.displayName,

		role: profile.role,
		rating: profile.rating,
		rank: profile.rank
	};
}

export function createShareRepositoryFake(
	initialShares: import('$lib/server/db/schema').SharedResult[] = []
): import('$lib/server/db/repositories/share-repository').ShareRepository & {
	shares: import('$lib/server/db/schema').SharedResult[];
} {
	const shares = [...initialShares];
	return {
		shares,
		async createShare(input) {
			const existing = shares.find((s) => s.sessionId === input.sessionId && !s.isRevoked);
			if (existing) {
				return existing;
			}
			const created: import('$lib/server/db/schema').SharedResult = {
				id: `shr-db-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				publicId: input.publicId,
				sessionId: input.sessionId,
				userId: input.userId,
				displayName: input.displayName ?? 'Guest Solver',
				isRevoked: false,
				revokedAt: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			shares.push(created);
			return created;
		},
		async findShareByPublicId(publicId) {
			return shares.find((s) => s.publicId === publicId) ?? null;
		},
		async findActiveShareBySessionId(sessionId) {
			return shares.filter((s) => s.sessionId === sessionId && !s.isRevoked).pop() ?? null;
		},
		async revokeShare(publicId) {
			const share = shares.find((s) => s.publicId === publicId);
			if (share) {
				share.isRevoked = true;
				share.revokedAt = new Date();
				share.updatedAt = new Date();
			}
			return share ?? null;
		}
	};
}

export function createDuelRepositoryFake(
	sessionRepository?: import('$lib/server/db/repositories/session-repository').SessionRepository
): import('$lib/server/db/repositories/duel-repository').DuelRepository & {
	duels: import('$lib/server/db/schema').ChallengeDuel[];
	participants: import('$lib/server/db/schema').DuelParticipant[];
} {
	const duels: import('$lib/server/db/schema').ChallengeDuel[] = [];
	const participants: import('$lib/server/db/schema').DuelParticipant[] = [];

	return {
		duels,
		participants,
		async createDuel(data) {
			const existing = duels.find(
				(d) => d.creatorSessionId === data.creatorSessionId && !d.isRevoked
			);
			if (existing) return existing;

			const created: import('$lib/server/db/schema').ChallengeDuel = {
				id: `duel-id-${duels.length + 1}`,
				publicId: data.publicId,
				creatorSessionId: data.creatorSessionId,
				creatorUserId: data.creatorUserId ?? null,
				creatorDisplayName: data.creatorDisplayName,
				creatorScore: data.creatorScore,
				creatorAccuracy: data.creatorAccuracy,
				creatorTotalTimeSeconds: data.creatorTotalTimeSeconds,
				sourceChallengeType: data.sourceChallengeType,
				totalQuestions: data.totalQuestions,
				puzzleSnapshot: data.puzzleSnapshot,
				isRevoked: false,
				revokedAt: null,
				expiresAt: data.expiresAt,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			duels.push(created);
			return created;
		},
		async findDuelByPublicId(publicId) {
			return duels.find((d) => d.publicId === publicId) ?? null;
		},
		async findActiveDuelBySessionId(sessionId) {
			return duels.find((d) => d.creatorSessionId === sessionId && !d.isRevoked) ?? null;
		},
		async findDuelById(id) {
			return duels.find((d) => d.id === id) ?? null;
		},
		async revokeDuel(publicId) {
			const duel = duels.find((d) => d.publicId === publicId);
			if (duel) {
				duel.isRevoked = true;
				duel.revokedAt = new Date();
				duel.updatedAt = new Date();
			}
		},
		async addParticipant(data) {
			if (data.userId) {
				const existing = participants.find(
					(p) => p.duelId === data.duelId && p.userId === data.userId
				);
				if (existing) return existing;
			} else if (data.guestTokenHash) {
				const existing = participants.find(
					(p) => p.duelId === data.duelId && p.guestTokenHash === data.guestTokenHash && !p.userId
				);
				if (existing) return existing;
			}

			const created: import('$lib/server/db/schema').DuelParticipant = {
				id: `part-id-${participants.length + 1}`,
				duelId: data.duelId,
				sessionId: data.sessionId,
				userId: data.userId ?? null,
				guestTokenHash: data.guestTokenHash ?? null,
				displayName: data.displayName,
				status: data.status ?? 'in_progress',
				score: data.score ?? 0,
				accuracy: data.accuracy ?? 0,
				totalTimeSeconds: data.totalTimeSeconds ?? 0,
				isSuspicious: data.isSuspicious ?? false,
				completedAt: data.completedAt ?? null,
				createdAt: new Date()
			};
			participants.push(created);
			return created;
		},
		async spawnParticipantSessionTransaction(input) {
			let existingParticipant: import('$lib/server/db/schema').DuelParticipant | null = null;
			if (input.userId) {
				existingParticipant =
					participants.find((p) => p.duelId === input.duel.id && p.userId === input.userId) ?? null;
			} else if (input.guestTokenHash) {
				existingParticipant =
					participants.find(
						(p) =>
							p.duelId === input.duel.id && p.guestTokenHash === input.guestTokenHash && !p.userId
					) ?? null;
			}

			if (existingParticipant) {
				const existingSession: import('$lib/server/db/schema').ChallengeSession = {
					id: existingParticipant.sessionId,
					userId: existingParticipant.userId,
					guestToken: existingParticipant.guestTokenHash,
					challengeType: 'duel',
					status: existingParticipant.status,
					totalQuestions: input.duel.totalQuestions,
					totalScore: existingParticipant.score,
					accuracy: existingParticipant.accuracy,
					totalTimeSeconds: existingParticipant.totalTimeSeconds,
					averageTimeSeconds: 0,
					ratingBefore: input.userRating,
					ratingAfter: input.userRating,
					ratingDelta: 0,
					rankBefore: input.userRank as RankName,
					rankAfter: input.userRank as RankName,
					isSuspicious: existingParticipant.isSuspicious,
					suspiciousReason: null,
					claimedAt: null,
					dailyChallengeId: null,
					completedAt: existingParticipant.completedAt,
					createdAt: existingParticipant.createdAt,
					updatedAt: new Date()
				};
				const questions: import('$lib/server/db/schema').SessionQuestion[] =
					input.duel.puzzleSnapshot.map((q, idx) => ({
						id: `q-${existingParticipant!.sessionId}-${idx}`,
						sessionId: existingParticipant!.sessionId,
						categoryId: q.categoryId,
						questionType: q.questionType,
						prompt: q.prompt,
						choices: q.choices,
						correctAnswer: q.correctAnswer,
						explanation: q.explanation,
						difficultyScore: q.difficultyScore,
						timeLimitSeconds: q.timeLimitSeconds,
						metadata: q.metadata ?? {},
						generatedSeed: '',
						orderIndex: q.orderIndex,
						createdAt: new Date()
					}));
				return {
					session: existingSession,
					participant: existingParticipant,
					questions,
					isNew: false
				};
			}

			const sessionId = `duel-session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
			const newSession: import('$lib/server/db/schema').ChallengeSession = {
				id: sessionId,
				userId: input.userId,
				guestToken: input.guestTokenHash,
				challengeType: 'duel',
				status: 'in_progress',
				totalQuestions: input.duel.totalQuestions,
				totalScore: 0,
				accuracy: 0,
				totalTimeSeconds: 0,
				averageTimeSeconds: 0,
				ratingBefore: input.userRating,
				ratingAfter: input.userRating,
				ratingDelta: 0,
				rankBefore: input.userRank as RankName,
				rankAfter: input.userRank as RankName,
				isSuspicious: false,
				suspiciousReason: null,
				claimedAt: null,
				dailyChallengeId: null,
				completedAt: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};

			const questions: import('$lib/server/db/schema').SessionQuestion[] =
				input.duel.puzzleSnapshot.map((q, idx) => ({
					id: `q-${sessionId}-${idx}`,
					sessionId,
					categoryId: q.categoryId,
					questionType: q.questionType,
					prompt: q.prompt,
					choices: q.choices,
					correctAnswer: q.correctAnswer,
					explanation: q.explanation,
					difficultyScore: q.difficultyScore,
					timeLimitSeconds: q.timeLimitSeconds,
					metadata: q.metadata ?? {},
					generatedSeed: '',
					orderIndex: q.orderIndex,
					createdAt: new Date()
				}));

			const participant: import('$lib/server/db/schema').DuelParticipant = {
				id: `part-id-${participants.length + 1}`,
				duelId: input.duel.id,
				sessionId,
				userId: input.userId,
				guestTokenHash: input.userId ? null : input.guestTokenHash,
				displayName: input.displayName,
				status: 'in_progress',
				score: 0,
				accuracy: 0,
				totalTimeSeconds: 0,
				isSuspicious: false,
				completedAt: null,
				createdAt: new Date()
			};
			participants.push(participant);

			if (sessionRepository) {
				await sessionRepository.createSession(newSession);
				await sessionRepository.addQuestions(questions as NewSessionQuestion[]);
			}

			return {
				session: newSession,
				participant,
				questions,
				isNew: true
			};
		},
		async findParticipantBySessionId(sessionId) {
			return participants.find((p) => p.sessionId === sessionId) ?? null;
		},
		async findParticipantByUser(duelId, userId) {
			return participants.find((p) => p.duelId === duelId && p.userId === userId) ?? null;
		},
		async findParticipantByGuest(duelId, guestTokenHash) {
			return (
				participants.find(
					(p) => p.duelId === duelId && p.guestTokenHash === guestTokenHash && !p.userId
				) ?? null
			);
		},
		async findParticipantsByDuelId(duelId) {
			return participants.filter((p) => p.duelId === duelId);
		},
		async completeParticipant(input) {
			const p = participants.find((item) => item.sessionId === input.sessionId);
			if (p) {
				p.status = 'completed';
				p.score = input.score;
				p.accuracy = input.accuracy;
				p.totalTimeSeconds = input.totalTimeSeconds;
				p.isSuspicious = input.isSuspicious;
				p.completedAt = input.completedAt;
			}
		},
		async claimGuestDuelParticipants(input) {
			const guestParts = participants.filter(
				(p) => p.guestTokenHash === input.guestTokenHash && !p.userId
			);
			let claimedCount = 0;
			for (const gp of guestParts) {
				const existing = participants.find(
					(p) => p.duelId === gp.duelId && p.userId === input.userId
				);
				if (!existing) {
					gp.userId = input.userId;
					claimedCount++;
				}
			}
			return { claimedCount };
		},
		async claimGuestCreatedDuels(input) {
			const matching = duels.filter(
				(d) => input.claimedSessionIds.includes(d.creatorSessionId) && !d.creatorUserId
			);
			for (const d of matching) {
				d.creatorUserId = input.userId;
			}
			return { claimedCount: matching.length };
		}
	};
}
