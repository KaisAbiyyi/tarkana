import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyRepository } from '$lib/server/db/repositories/daily-repository';

const track = vi.fn();

vi.mock('$lib/server/analytics/analytics-service', () => ({
	getAnalyticsService: () => ({ track })
}));

const { createDailyStreakService } = await import('./daily-streak-service');

function repoWithDates(dates: string[] | Error): DailyRepository {
	return {
		listCompletedDailyDates: vi.fn(async () => {
			if (dates instanceof Error) throw dates;
			return dates;
		})
	} as unknown as DailyRepository;
}

describe('daily streak service', () => {
	beforeEach(() => {
		track.mockReset();
		track.mockResolvedValue({ id: 'evt' });
	});

	it('returns an empty streak without querying when there is no identity', async () => {
		const repo = repoWithDates(['2026-11-20']);
		const streak = await createDailyStreakService(repo).getStreak(null, '2026-11-20');
		expect(streak.state).toBe('none');
		expect(repo.listCompletedDailyDates).not.toHaveBeenCalled();
	});

	it('evaluates the identity streak from repository dates', async () => {
		const repo = repoWithDates(['2026-11-18', '2026-11-19']);
		const streak = await createDailyStreakService(repo).getStreak(
			{ userId: 'user-1' },
			'2026-11-20'
		);
		expect(repo.listCompletedDailyDates).toHaveBeenCalledWith({ userId: 'user-1' });
		expect(streak).toMatchObject({ state: 'at_risk', currentStreak: 2 });
	});

	it('tracks daily_streak_updated with allowlisted properties', async () => {
		const repo = repoWithDates(['2026-11-18', '2026-11-19', '2026-11-20']);
		await createDailyStreakService(repo).trackStreakUpdate({
			identity: { guestTokenHash: 'hash' },
			completedDate: '2026-11-20',
			distinctId: 'dist-1',
			userId: null,
			isGuest: true
		});

		expect(track).toHaveBeenCalledWith({
			distinctId: 'dist-1',
			userId: null,
			event: 'daily_streak_updated',
			properties: {
				outcome: 'extended',
				streak_length: 3,
				previous_streak_length: 2,
				freezes_used: 0,
				freeze_earned: false,
				milestone_reached: 3,
				is_guest: true,
				rules_version: 1
			}
		});
	});

	it('does not track when the completion is excluded from the streak (e.g. suspicious)', async () => {
		const repo = repoWithDates(['2026-11-18']);
		await createDailyStreakService(repo).trackStreakUpdate({
			identity: { userId: 'user-1' },
			completedDate: '2026-11-20',
			distinctId: 'dist-1',
			userId: 'user-1',
			isGuest: false
		});
		expect(track).not.toHaveBeenCalled();
	});

	it('never throws when the repository or analytics fails', async () => {
		const failingRepo = repoWithDates(new Error('db down'));
		await expect(
			createDailyStreakService(failingRepo).trackStreakUpdate({
				identity: { userId: 'user-1' },
				completedDate: '2026-11-20',
				distinctId: 'dist-1',
				userId: 'user-1',
				isGuest: false
			})
		).resolves.toBeUndefined();

		track.mockRejectedValueOnce(new Error('analytics down'));
		await expect(
			createDailyStreakService(repoWithDates(['2026-11-20'])).trackStreakUpdate({
				identity: { userId: 'user-1' },
				completedDate: '2026-11-20',
				distinctId: 'dist-1',
				userId: 'user-1',
				isGuest: false
			})
		).resolves.toBeUndefined();
	});
});
