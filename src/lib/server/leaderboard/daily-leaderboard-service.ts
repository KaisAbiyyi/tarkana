import type { RequestEvent } from '@sveltejs/kit';
import { badRequest } from '$lib/server/errors';
import { getOptionalProfile } from '$lib/server/auth/guards';
import { getGuestToken, hashGuestToken } from '$lib/server/sessions/guest-token';
import {
	createDailyRepository,
	type DailyRepository
} from '$lib/server/db/repositories/daily-repository';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import {
	createDailyChallengeService,
	type DailyChallengeService
} from '$lib/server/challenge/daily-challenge-service';
import {
	getSecondsUntilNextUtcMidnight,
	getUtcDateString
} from '$lib/server/challenge/daily-challenge';
import type {
	DailyLeaderboardEntryDto,
	DailyLeaderboardResultDto
} from '$lib/shared/types/leaderboard';

export interface GetDailyLeaderboardOptions {
	date?: string;
	limit?: number;
	offset?: number;
}

export interface DailyLeaderboardService {
	getLeaderboard(
		event: RequestEvent,
		options?: GetDailyLeaderboardOptions
	): Promise<DailyLeaderboardResultDto>;
	getAroundMe(
		event: RequestEvent,
		options?: { date?: string; windowSize?: number }
	): Promise<DailyLeaderboardEntryDto[]>;
}

export function createDailyLeaderboardService(
	dailyRepository: DailyRepository = createDailyRepository(),
	profileRepository: ProfileRepository = createProfileRepository(),
	dailyChallengeService: DailyChallengeService = createDailyChallengeService(dailyRepository)
): DailyLeaderboardService {
	return {
		async getLeaderboard(event, options = {}) {
			const today = getUtcDateString();
			const requestedDate = options.date ?? today;

			// Validate date format YYYY-MM-DD
			if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
				throw badRequest('Invalid date format. Expected YYYY-MM-DD');
			}

			const parsedDate = new Date(`${requestedDate}T00:00:00.000Z`);
			if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== requestedDate) {
				throw badRequest('Invalid calendar date');
			}

			// Reject future dates
			if (requestedDate > today) {
				throw badRequest('Cannot view leaderboards for future dates');
			}

			const limit = Math.min(100, Math.max(1, options.limit ?? 50));
			const offset = Math.max(0, options.offset ?? 0);

			// Historical lookups must NEVER generate or create a daily challenge snapshot!
			let daily = await dailyRepository.findDailyChallengeByDate(requestedDate);
			if (!daily) {
				if (requestedDate === today) {
					// Only initialize today's challenge if needed
					daily = await dailyChallengeService.getOrCreateDailyChallenge(today);
				} else {
					// Past date with no challenge snapshot
					return {
						date: requestedDate,
						items: [],
						currentUserEntry: null,
						guestHypotheticalEntry: null,
						totalParticipants: 0,
						secondsUntilReset: null,
						limit,
						offset
					};
				}
			}

			const [leaderboardData, profile] = await Promise.all([
				dailyRepository.getDailyLeaderboard({
					dailyChallengeId: daily.id,
					limit,
					offset
				}),
				getOptionalProfile(event, profileRepository)
			]);

			let currentUserEntry: DailyLeaderboardEntryDto | null = null;
			let guestHypotheticalEntry: DailyLeaderboardResultDto['guestHypotheticalEntry'] = null;

			if (profile) {
				const userPos = await dailyRepository.getUserDailyPosition({
					dailyChallengeId: daily.id,
					userId: profile.id
				});

				if (userPos) {
					currentUserEntry = {
						position: userPos.position,
						displayName: userPos.displayName,
						logicRank: userPos.logicRank,
						score: userPos.score,
						accuracy: Math.round(userPos.accuracy * 100) / 100,
						totalTimeSeconds: userPos.totalTimeSeconds,
						completedAt: userPos.completedAt.toISOString(),
						isCurrent: true
					};
				}
			} else {
				const guestToken = getGuestToken(event);
				if (guestToken) {
					const guestPos = await dailyRepository.getGuestHypotheticalPosition({
						dailyChallengeId: daily.id,
						guestTokenHash: hashGuestToken(guestToken)
					});

					if (guestPos) {
						guestHypotheticalEntry = {
							hypotheticalPosition: guestPos.hypotheticalPosition,
							score: guestPos.score,
							accuracy: Math.round(guestPos.accuracy * 100) / 100,
							totalTimeSeconds: guestPos.totalTimeSeconds
						};
					}
				}
			}

			// Map items to public DTOs without leaking internal IDs
			const items: DailyLeaderboardEntryDto[] = leaderboardData.items.map((row) => ({
				position: row.position,
				displayName: row.displayName,
				logicRank: row.logicRank,
				score: row.score,
				accuracy: Math.round(row.accuracy * 100) / 100,
				totalTimeSeconds: row.totalTimeSeconds,
				completedAt: row.completedAt.toISOString(),
				...(profile && row.userId === profile.id ? { isCurrent: true } : {})
			}));

			return {
				date: requestedDate,
				items,
				currentUserEntry,
				guestHypotheticalEntry,
				totalParticipants: leaderboardData.totalParticipants,
				secondsUntilReset: requestedDate === today ? getSecondsUntilNextUtcMidnight() : null,
				limit,
				offset
			};
		},

		async getAroundMe(event, options = {}) {
			const profile = await getOptionalProfile(event, profileRepository);
			if (!profile) return [];

			const today = getUtcDateString();
			const requestedDate = options.date ?? today;
			if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || requestedDate > today) {
				return [];
			}

			const daily = await dailyRepository.findDailyChallengeByDate(requestedDate);
			if (!daily) return [];

			const rows = await dailyRepository.getAroundMeDailyLeaderboard({
				dailyChallengeId: daily.id,
				userId: profile.id,
				windowSize: options.windowSize ?? 2
			});

			return rows.map((row) => ({
				position: row.position,
				displayName: row.displayName,
				logicRank: row.logicRank,
				score: row.score,
				accuracy: Math.round(row.accuracy * 100) / 100,
				totalTimeSeconds: row.totalTimeSeconds,
				completedAt: row.completedAt.toISOString(),
				isCurrent: row.userId === profile.id
			}));
		}
	};
}
