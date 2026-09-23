import crypto from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { getOptionalProfile } from '$lib/server/auth/guards';
import {
	generateGuestToken,
	getGuestToken,
	hashGuestToken,
	setGuestTokenCookie
} from '$lib/server/sessions/guest-token';
import { badRequest, forbidden, notFound, unauthorized } from '$lib/server/errors';
import { getAppOrigin } from '$lib/server/share/share-service';
import { getAnalyticsService } from '$lib/server/analytics/analytics-service';
import { getOrSetDistinctId } from '$lib/server/analytics/distinct-id';
import {
	createDuelRepository,
	type DuelRepository
} from '$lib/server/db/repositories/duel-repository';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import type {
	ChallengeSession,
	DailyPuzzleSnapshotQuestion,
	DuelParticipant
} from '$lib/server/db/schema';
import type { ChallengeType } from '$lib/shared/constants/challenge';
import { toActiveQuestionDto } from '$lib/server/sessions/dto';
import { generateSafeDuelPseudonym } from './pseudonyms';
import { compareContenders, resolveDuelOutcome, type DuelOutcome } from './outcome';

export interface CreateDuelInput {
	sessionId: string;
}

export interface CreateDuelResult {
	publicId: string;
	duelUrl: string;
	analyticsDuelId: string;
}

export interface DuelPreGameDto {
	publicId: string;
	creatorDisplayName: string;
	sourceChallengeType: ChallengeType;
	totalQuestions: number;
	expiresAt: Date;
	isExpired: boolean;
	isCreator: boolean;
	hasAttemptInProgress: boolean;
	activeSessionId?: string;
	completedSessionId?: string;
}

export interface DuelQuestionOutcomeDto {
	orderIndex: number;
	isCorrect: boolean;
}

export interface DuelContenderDto {
	userId?: string;
	displayName: string;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
	isCreator: boolean;
	isSuspicious: boolean;
	completedAt: Date | null;
}

export interface DuelParticipantDto {
	displayName: string;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
	isSuspicious: boolean;
	outcome: DuelOutcome;
}

export interface DuelComparisonDto {
	publicId: string;
	creatorDisplayName: string;
	creatorScore: number;
	creatorAccuracy: number;
	creatorTotalTimeSeconds: number;
	sourceChallengeType: ChallengeType;
	totalQuestions: number;
	isCreator: boolean;
	userParticipant?: DuelParticipantDto;
	outcome?: DuelOutcome;
	creatorQuestions: DuelQuestionOutcomeDto[];
	standings: DuelContenderDto[];
}

export type DuelPublicViewResult =
	| ({ state: 'pre_game' } & DuelPreGameDto)
	| ({ state: 'completed' } & DuelComparisonDto);

export interface AcceptDuelResult {
	status: 'started' | 'resumed' | 'already_completed';
	sessionId: string;
	currentQuestion?: ReturnType<typeof toActiveQuestionDto>;
	questions?: ReturnType<typeof toActiveQuestionDto>[];
	isResumed?: boolean;
}

export interface DuelService {
	createDuel(event: RequestEvent, input: CreateDuelInput): Promise<CreateDuelResult>;
	getDuelPublicView(event: RequestEvent, publicId: string): Promise<DuelPublicViewResult>;
	acceptDuel(event: RequestEvent, publicId: string): Promise<AcceptDuelResult>;
	revokeDuel(event: RequestEvent, publicId: string): Promise<void>;
}

/**
 * Hashing capability ID for privacy in analytics. Never sends raw publicId to third-party tools.
 */
export function toAnalyticsDuelId(publicId: string): string {
	return crypto.createHash('sha256').update(publicId).digest('hex').slice(0, 16);
}

function generateOpaqueDuelId(): string {
	return `chf_${crypto.randomBytes(9).toString('base64url')}`;
}

export function createDuelService(
	duelRepository: DuelRepository = createDuelRepository(),
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository()
): DuelService {
	return {
		async createDuel(event, input) {
			const profile = await getOptionalProfile(event, profileRepository);
			const guestToken = getGuestToken(event);

			let session: ChallengeSession | null;
			if (profile) {
				session = await sessionRepository.findOwnedSession(input.sessionId, profile.id);
			} else if (guestToken) {
				session = await sessionRepository.findGuestSession(input.sessionId, guestToken);
			} else {
				throw unauthorized('Unauthorized or guest token missing');
			}

			if (!session) {
				throw notFound(`Challenge session ${input.sessionId} was not found`);
			}

			if (session.status !== 'completed') {
				throw badRequest('Only completed challenges can be used to create a duel');
			}

			if (session.isSuspicious) {
				throw forbidden('Suspicious sessions cannot be used to create a duel');
			}

			if (session.challengeType !== 'standard' && session.challengeType !== 'quick') {
				throw badRequest(
					'Only standard or quick logic challenges are eligible for Challenge-a-Friend duels'
				);
			}

			// Idempotency: return existing active duel for this session
			const existingDuel = await duelRepository.findActiveDuelBySessionId(session.id);
			const origin = getAppOrigin(event);
			if (existingDuel) {
				return {
					publicId: existingDuel.publicId,
					duelUrl: `${origin}/duel/${existingDuel.publicId}`,
					analyticsDuelId: toAnalyticsDuelId(existingDuel.publicId)
				};
			}

			const questions = await sessionRepository.listSessionQuestions(session.id);
			if (questions.length === 0) {
				throw badRequest('Session has no questions to duel with');
			}

			// Construct immutable puzzle snapshot without reconstructive seeds or unsafe metadata
			const puzzleSnapshot: DailyPuzzleSnapshotQuestion[] = questions.map((q) => ({
				orderIndex: q.orderIndex,
				categoryId: q.categoryId,
				questionType: q.questionType,
				prompt: q.prompt,
				choices: q.choices,
				correctAnswer: q.correctAnswer,
				explanation: q.explanation,
				difficultyScore: q.difficultyScore,
				timeLimitSeconds: q.timeLimitSeconds,
				metadata: {},
				generatedSeed: ''
			}));

			const creatorDisplayName = profile?.displayName ?? generateSafeDuelPseudonym();
			const publicId = generateOpaqueDuelId();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

			const duel = await duelRepository.createDuel({
				publicId,
				creatorSessionId: session.id,
				creatorUserId: profile?.id ?? null,
				creatorDisplayName,
				creatorScore: session.totalScore,
				creatorAccuracy: session.accuracy,
				creatorTotalTimeSeconds: session.totalTimeSeconds,
				sourceChallengeType: session.challengeType,
				totalQuestions: questions.length,
				puzzleSnapshot,
				expiresAt
			});

			const analyticsDuelId = toAnalyticsDuelId(duel.publicId);

			try {
				const distinctId = getOrSetDistinctId(event);
				getAnalyticsService()
					.track({
						distinctId,
						userId: profile?.id ?? null,
						event: 'duel_created',
						properties: {
							duel_id: analyticsDuelId,
							challenge_type: session.challengeType,
							is_guest: !profile
						}
					})
					.catch(() => {});
			} catch {
				/* ignore */
			}

			return {
				publicId: duel.publicId,
				duelUrl: `${origin}/duel/${duel.publicId}`,
				analyticsDuelId
			};
		},

		async getDuelPublicView(event, publicId) {
			const duel = await duelRepository.findDuelByPublicId(publicId);
			if (!duel) {
				throw notFound('Challenge duel was not found');
			}

			if (duel.isRevoked) {
				throw notFound('Duel invitation has been revoked');
			}

			const profile = await getOptionalProfile(event, profileRepository);
			const guestToken = getGuestToken(event);
			const guestHash = guestToken ? hashGuestToken(guestToken) : null;

			// Check if current viewer is the creator
			let isCreator = false;
			if (profile && duel.creatorUserId && duel.creatorUserId === profile.id) {
				isCreator = true;
			} else if (guestToken) {
				const creatorSession = await sessionRepository.findGuestSession(
					duel.creatorSessionId,
					guestToken
				);
				if (creatorSession) {
					isCreator = true;
				}
			}

			// Check if viewer has participated
			let participant: DuelParticipant | null = null;
			if (profile) {
				participant = await duelRepository.findParticipantByUser(duel.id, profile.id);
			} else if (guestHash) {
				participant = await duelRepository.findParticipantByGuest(duel.id, guestHash);
			}

			const isCompleted = participant?.status === 'completed';

			const allParticipants = await duelRepository.findParticipantsByDuelId(duel.id);
			const completedParticipants = allParticipants.filter((p) => p.status === 'completed');
			const hasAnyCompleted = completedParticipants.length > 0;

			// If completed (or viewer is creator AND at least one person completed), show full comparison!
			if (isCompleted || (isCreator && hasAnyCompleted)) {
				const creatorAnswers = await sessionRepository.listSessionAnswers(duel.creatorSessionId);
				const creatorAnswersMap = new Map(
					creatorAnswers.map((a) => [a.sessionQuestionId, a.isCorrect])
				);

				const questions = await sessionRepository.listSessionQuestions(duel.creatorSessionId);

				const creatorStats = {
					score: duel.creatorScore,
					accuracy: duel.creatorAccuracy,
					totalTimeSeconds: duel.creatorTotalTimeSeconds
				};

				const validParticipants = allParticipants.filter(
					(p) => p.status === 'completed' && !p.isSuspicious
				);

				const standings: DuelContenderDto[] = [
					{
						displayName: duel.creatorDisplayName,
						score: duel.creatorScore,
						accuracy: duel.creatorAccuracy,
						totalTimeSeconds: duel.creatorTotalTimeSeconds,
						isCreator: true,
						isSuspicious: false,
						completedAt: duel.createdAt
					},
					...validParticipants.map((p) => ({
						userId: p.userId ?? undefined,
						displayName: p.displayName,
						score: p.score ?? 0,
						accuracy: p.accuracy ?? 0,
						totalTimeSeconds: p.totalTimeSeconds ?? 0,
						isCreator: false,
						isSuspicious: p.isSuspicious,
						completedAt: p.completedAt ?? new Date()
					}))
				].sort(compareContenders);

				const comparisonData: DuelComparisonDto = {
					publicId: duel.publicId,
					creatorDisplayName: duel.creatorDisplayName,
					creatorScore: duel.creatorScore,
					creatorAccuracy: duel.creatorAccuracy,
					creatorTotalTimeSeconds: duel.creatorTotalTimeSeconds,
					sourceChallengeType: duel.sourceChallengeType,
					totalQuestions: duel.totalQuestions,
					isCreator,
					userParticipant: participant
						? {
								displayName: participant.displayName,
								score: participant.score ?? 0,
								accuracy: participant.accuracy ?? 0,
								totalTimeSeconds: participant.totalTimeSeconds ?? 0,
								isSuspicious: participant.isSuspicious,
								outcome: resolveDuelOutcome(participant, creatorStats)
							}
						: undefined,
					outcome: participant ? resolveDuelOutcome(participant, creatorStats) : undefined,
					creatorQuestions: questions.map((q) => ({
						orderIndex: q.orderIndex,
						isCorrect: creatorAnswersMap.get(q.id) ?? false
					})),
					standings
				};

				return {
					state: 'completed',
					...comparisonData
				};
			}

			// Pre-game blind invitation state (zero spoilers)
			const isExpired = duel.expiresAt.getTime() < Date.now();
			const preGameData: DuelPreGameDto = {
				publicId: duel.publicId,
				creatorDisplayName: duel.creatorDisplayName,
				sourceChallengeType: duel.sourceChallengeType,
				totalQuestions: duel.totalQuestions,
				expiresAt: duel.expiresAt,
				isExpired,
				isCreator,
				hasAttemptInProgress: participant?.status === 'in_progress',
				activeSessionId: participant?.sessionId,
				completedSessionId: participant?.status === 'completed' ? participant.sessionId : undefined
			};

			return {
				state: 'pre_game',
				...preGameData
			};
		},

		async acceptDuel(event, publicId) {
			const duel = await duelRepository.findDuelByPublicId(publicId);
			if (!duel) {
				throw notFound('Challenge duel was not found');
			}

			if (duel.isRevoked) {
				throw notFound('Duel invitation has been revoked');
			}

			const profile = await getOptionalProfile(event, profileRepository);
			let guestToken = getGuestToken(event);
			if (!profile && !guestToken) {
				guestToken = generateGuestToken();
				setGuestTokenCookie(event, guestToken);
			}

			// Check if caller is creator: creators cannot accept their own duel!
			if (profile && duel.creatorUserId && duel.creatorUserId === profile.id) {
				throw forbidden('Creators cannot accept their own duel');
			}
			if (!profile && guestToken) {
				const creatorSession = await sessionRepository.findGuestSession(
					duel.creatorSessionId,
					guestToken
				);
				if (creatorSession) {
					throw forbidden('Creators cannot accept their own duel');
				}
			}

			const guestHash = guestToken ? hashGuestToken(guestToken) : null;

			// Check if caller already has a participant record
			let participant: DuelParticipant | null = null;
			if (profile) {
				participant = await duelRepository.findParticipantByUser(duel.id, profile.id);
			} else if (guestHash) {
				participant = await duelRepository.findParticipantByGuest(duel.id, guestHash);
			}

			// Resume or report existing attempt
			if (participant) {
				if (participant.status === 'completed') {
					return {
						status: 'already_completed',
						sessionId: participant.sessionId
					};
				}

				// Resume in-progress attempt
				const questions = await sessionRepository.listSessionQuestions(participant.sessionId);
				const answers = await sessionRepository.listSessionAnswers(participant.sessionId);
				const answeredQuestionIds = new Set(answers.map((a) => a.sessionQuestionId));
				const nextQuestion = questions.find((q) => !answeredQuestionIds.has(q.id)) ?? questions[0]!;

				return {
					status: 'resumed',
					sessionId: participant.sessionId,
					currentQuestion: toActiveQuestionDto(nextQuestion),
					questions: questions.map((q) => toActiveQuestionDto(q)),
					isResumed: true
				};
			}

			// New acceptance: check expiration
			if (duel.expiresAt.getTime() < Date.now()) {
				throw badRequest('Duel invitation has expired');
			}

			// Spawn participant session
			const userRating = profile ? profile.rating : 0;
			const userRank = profile ? profile.rank : 'Unranked';

			const session = await sessionRepository.createSession({
				userId: profile?.id ?? null,
				guestToken: guestHash,
				challengeType: 'duel',
				status: 'in_progress',
				totalQuestions: duel.totalQuestions,
				ratingBefore: userRating,
				ratingAfter: userRating,
				rankBefore: userRank,
				rankAfter: userRank
			});

			// Replay exact puzzle snapshot questions
			const persistedQuestions = await sessionRepository.addQuestions(
				duel.puzzleSnapshot.map((q) => ({
					sessionId: session.id,
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
					orderIndex: q.orderIndex
				}))
			);

			const displayName = profile?.displayName ?? generateSafeDuelPseudonym();

			await duelRepository.addParticipant({
				duelId: duel.id,
				sessionId: session.id,
				userId: profile?.id ?? null,
				guestTokenHash: guestHash,
				displayName,
				status: 'in_progress'
			});

			try {
				const distinctId = getOrSetDistinctId(event);
				getAnalyticsService()
					.track({
						distinctId,
						userId: profile?.id ?? null,
						event: 'duel_accepted',
						properties: {
							duel_id: toAnalyticsDuelId(duel.publicId),
							challenge_type: duel.sourceChallengeType,
							is_guest: !profile
						}
					})
					.catch(() => {});
			} catch {
				/* ignore */
			}

			const firstQuestion = persistedQuestions[0]!;
			return {
				status: 'started',
				sessionId: session.id,
				currentQuestion: toActiveQuestionDto(firstQuestion),
				questions: persistedQuestions.map((q) => toActiveQuestionDto(q)),
				isResumed: false
			};
		},

		async revokeDuel(event, publicId) {
			const duel = await duelRepository.findDuelByPublicId(publicId);
			if (!duel) {
				throw notFound('Challenge duel was not found');
			}

			if (duel.isRevoked) {
				return;
			}

			const profile = await getOptionalProfile(event, profileRepository);
			const guestToken = getGuestToken(event);

			let isAuthorized = false;
			if (profile && duel.creatorUserId && duel.creatorUserId === profile.id) {
				isAuthorized = true;
			} else if (guestToken) {
				const creatorSession = await sessionRepository.findGuestSession(
					duel.creatorSessionId,
					guestToken
				);
				if (creatorSession) {
					isAuthorized = true;
				}
			}

			if (!isAuthorized) {
				throw forbidden('Only the creator can revoke this duel');
			}

			await duelRepository.revokeDuel(publicId);
		}
	};
}
