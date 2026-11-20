import type {
	DailyRepository,
	DailyStreakIdentity
} from '$lib/server/db/repositories/daily-repository';
import type { DailyStreakDto } from '$lib/shared/types/streak';
import { getAnalyticsService } from '$lib/server/analytics/analytics-service';
import {
	DAILY_STREAK_RULES_VERSION,
	evaluateDailyStreak,
	resolveDailyStreakTransition
} from './daily-streak';

export interface TrackDailyStreakUpdateInput {
	identity: DailyStreakIdentity;
	completedDate: string;
	distinctId: string;
	userId: string | null;
	isGuest: boolean;
}

export interface DailyStreakService {
	/** Streak as seen on `today` (UTC). A null identity has no history. */
	getStreak(identity: DailyStreakIdentity | null, today: string): Promise<DailyStreakDto>;
	/** Records `daily_streak_updated` for a daily completed just now. Never throws. */
	trackStreakUpdate(input: TrackDailyStreakUpdateInput): Promise<void>;
}

export function createDailyStreakService(dailyRepository: DailyRepository): DailyStreakService {
	return {
		async getStreak(identity, today) {
			const dates = identity ? await dailyRepository.listCompletedDailyDates(identity) : [];
			return evaluateDailyStreak(dates, today);
		},

		async trackStreakUpdate(input) {
			try {
				const dates = await dailyRepository.listCompletedDailyDates(input.identity);
				// Suspicious or unofficial completions are excluded from the streak, so
				// there is nothing to report.
				if (!dates.includes(input.completedDate)) return;

				const transition = resolveDailyStreakTransition(dates, input.completedDate);
				await getAnalyticsService().track({
					distinctId: input.distinctId,
					userId: input.userId,
					event: 'daily_streak_updated',
					properties: {
						outcome: transition.outcome,
						streak_length: transition.streakLength,
						previous_streak_length: transition.previousStreak,
						freezes_used: transition.freezesUsed,
						freeze_earned: transition.freezeEarned,
						milestone_reached: transition.milestoneReached,
						is_guest: input.isGuest,
						rules_version: DAILY_STREAK_RULES_VERSION
					}
				});
			} catch {
				// Analytics must never break challenge completion.
			}
		}
	};
}
