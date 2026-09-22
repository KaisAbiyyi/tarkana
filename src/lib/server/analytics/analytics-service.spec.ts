import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsService, type PostHogForwarder } from './analytics-service';
import { createAnalyticsRepositoryFake } from './test-fakes';

describe('AnalyticsService', () => {
	function setup() {
		const repo = createAnalyticsRepositoryFake();
		const mockPosthog: PostHogForwarder = {
			capture: vi.fn().mockResolvedValue(undefined),
			alias: vi.fn().mockResolvedValue(undefined)
		};
		const service = createAnalyticsService(repo, mockPosthog);
		return { repo, mockPosthog, service };
	}

	it('tracks canonical events and forwards them to storage and PostHog', async () => {
		const { service, mockPosthog } = setup();

		const event = await service.track({
			distinctId: 'anon-123',
			event: 'landing_view',
			properties: {
				locale: 'en',
				referrer: 'https://example.com'
			}
		});

		expect(event.event).toBe('landing_view');
		expect(event.distinctId).toBe('anon-123');
		expect(event.properties).toEqual({
			locale: 'en',
			referrer: 'example.com'
		});
		expect(mockPosthog.capture).toHaveBeenCalledWith(
			'landing_view',
			'anon-123',
			expect.objectContaining({
				locale: 'en',
				referrer: 'example.com'
			})
		);
	});

	it('enforces idempotent event IDs', async () => {
		const { service } = setup();
		const fixedId = '00000000-0000-4000-8000-000000000001';

		const first = await service.track({
			id: fixedId,
			distinctId: 'anon-123',
			event: 'challenge_started',
			properties: {
				challenge_type: 'quick',
				is_guest: true,
				session_id: '123e4567-e89b-12d3-a456-426614174000'
			}
		});

		const duplicate = await service.track({
			id: fixedId,
			distinctId: 'anon-123',
			event: 'challenge_started',
			properties: {
				challenge_type: 'quick',
				is_guest: true,
				session_id: '123e4567-e89b-12d3-a456-426614174000'
			}
		});

		expect(first.id).toBe(fixedId);
		expect(duplicate.id).toBe(fixedId);
	});

	it('stitching: records alias without mutating immutable event history', async () => {
		const { service, repo, mockPosthog } = setup();

		// Anonymous user tracks landing and challenge
		await service.track({
			distinctId: 'anon-abc',
			event: 'landing_view',
			properties: { locale: 'en' }
		});
		await service.track({
			distinctId: 'anon-abc',
			event: 'challenge_started',
			properties: {
				challenge_type: 'quick',
				is_guest: true,
				session_id: '123e4567-e89b-12d3-a456-426614174000'
			}
		});

		// User signs up / registers
		const userId = '00000000-0000-4000-8000-000000000099';
		await service.identify('anon-abc', userId);

		expect(mockPosthog.alias).toHaveBeenCalledWith(userId, 'anon-abc');

		// Verify event history is immutable: raw event rows still keep their original userId (null)
		const events = await repo.listEventsForDistinctId('anon-abc');
		expect(events.length).toBe(2);
		expect(events[0].userId).toBeNull();
		expect(events[1].userId).toBeNull();

		// Subsequent user event tracked with authenticated userId
		await service.track({
			distinctId: 'anon-abc',
			userId,
			event: 'challenge_completed',
			properties: {
				session_id: '123e4567-e89b-12d3-a456-426614174000',
				challenge_type: 'quick',
				total_score: 100,
				accuracy: 1,
				total_time_seconds: 45,
				is_guest: false
			}
		});

		// Funnel query dynamically resolves the alias stitching
		const funnel = await service.getFunnel();
		expect(funnel.totalStarted).toBe(1);
		expect(funnel.steps[0].count).toBe(1); // landing_view
		expect(funnel.steps[1].count).toBe(1); // challenge_started
		expect(funnel.steps[2].count).toBe(1); // challenge_completed
		expect(funnel.overallConversionRate).toBe(1);
	});

	it('computes activation and guest conversion funnels independently', async () => {
		const { service } = setup();

		const t0 = new Date('2026-09-01T10:00:00Z');
		const t1 = new Date('2026-09-01T10:05:00Z');
		const t2 = new Date('2026-09-01T10:10:00Z');
		const t3 = new Date('2026-09-01T10:15:00Z');
		const t4 = new Date('2026-09-01T10:20:00Z');

		// User 1 goes all the way through activation and guest conversion
		await service.track({ distinctId: 'u1', event: 'landing_view', timestamp: t0 });
		await service.track({
			distinctId: 'u1',
			event: 'challenge_started',
			timestamp: t1,
			properties: {
				challenge_type: 'quick',
				is_guest: true,
				session_id: '00000000-0000-4000-8000-000000000001'
			}
		});
		await service.track({
			distinctId: 'u1',
			event: 'challenge_completed',
			timestamp: t2,
			properties: {
				session_id: '00000000-0000-4000-8000-000000000001',
				challenge_type: 'quick',
				total_score: 100,
				accuracy: 1,
				total_time_seconds: 30,
				is_guest: true
			}
		});
		await service.track({ distinctId: 'u1', event: 'signup_completed', timestamp: t3 });
		await service.track({ distinctId: 'u1', event: 'guest_claim_succeeded', timestamp: t4 });

		// User 2 completes challenge but does not sign up
		await service.track({ distinctId: 'u2', event: 'landing_view', timestamp: t0 });
		await service.track({
			distinctId: 'u2',
			event: 'challenge_started',
			timestamp: t1,
			properties: {
				challenge_type: 'quick',
				is_guest: true,
				session_id: '00000000-0000-4000-8000-000000000002'
			}
		});
		await service.track({
			distinctId: 'u2',
			event: 'challenge_completed',
			timestamp: t2,
			properties: {
				session_id: '00000000-0000-4000-8000-000000000002',
				challenge_type: 'quick',
				total_score: 80,
				accuracy: 0.8,
				total_time_seconds: 40,
				is_guest: true
			}
		});

		// User 3 bounces on landing_view
		await service.track({ distinctId: 'u3', event: 'landing_view', timestamp: t0 });

		// 1. Activation Funnel: landing_view -> challenge_started -> challenge_completed
		const activationFunnel = await service.getFunnel();
		expect(activationFunnel.totalStarted).toBe(3);
		expect(activationFunnel.steps).toHaveLength(3);
		expect(activationFunnel.steps[0].count).toBe(3); // landing_view
		expect(activationFunnel.steps[1].count).toBe(2); // challenge_started
		expect(activationFunnel.steps[2].count).toBe(2); // challenge_completed
		expect(activationFunnel.overallConversionRate).toBe(0.667);

		// 2. Guest Conversion Funnel: challenge_completed -> signup_completed -> guest_claim_succeeded
		const conversionFunnel = await service.getFunnel([
			'challenge_completed',
			'signup_completed',
			'guest_claim_succeeded'
		]);
		expect(conversionFunnel.totalStarted).toBe(2); // u1, u2
		expect(conversionFunnel.steps).toHaveLength(3);
		expect(conversionFunnel.steps[0].count).toBe(2); // challenge_completed
		expect(conversionFunnel.steps[1].count).toBe(1); // signup_completed
		expect(conversionFunnel.steps[2].count).toBe(1); // guest_claim_succeeded
		expect(conversionFunnel.overallConversionRate).toBe(0.5);
	});

	it('computes retention counting only meaningful product activity (challenges)', async () => {
		const { service } = setup();

		const cohortStart = new Date('2026-09-01T00:00:00Z');
		const cohortEnd = new Date('2026-09-02T00:00:00Z');

		// Actor A: plays challenge on Day 0 (Sep 1, 10:00), Day 1 (Sep 2, 12:00 = +26h), Day 7 (Sep 8, 11:00 = +169h)
		await service.track({
			distinctId: 'user-a',
			event: 'challenge_started',
			timestamp: new Date('2026-09-01T10:00:00Z'),
			properties: {
				challenge_type: 'quick',
				is_guest: false,
				session_id: '00000000-0000-4000-8000-000000000001'
			}
		});
		await service.track({
			distinctId: 'user-a',
			event: 'challenge_completed',
			timestamp: new Date('2026-09-02T12:00:00Z'), // +26 hours (Day 1)
			properties: {
				session_id: '00000000-0000-4000-8000-000000000001',
				challenge_type: 'quick',
				total_score: 90,
				accuracy: 0.9,
				total_time_seconds: 35,
				is_guest: false
			}
		});
		await service.track({
			distinctId: 'user-a',
			event: 'challenge_started',
			timestamp: new Date('2026-09-08T11:00:00Z'), // +169 hours (Day 7)
			properties: {
				challenge_type: 'quick',
				is_guest: false,
				session_id: '00000000-0000-4000-8000-000000000002'
			}
		});

		// Actor B: plays challenge on Day 0 (Sep 1, 14:00), plays on Day 1 (+25h), not on Day 7
		await service.track({
			distinctId: 'user-b',
			event: 'challenge_started',
			timestamp: new Date('2026-09-01T14:00:00Z'),
			properties: {
				challenge_type: 'quick',
				is_guest: true,
				session_id: '00000000-0000-4000-8000-000000000003'
			}
		});
		await service.track({
			distinctId: 'user-b',
			event: 'challenge_started',
			timestamp: new Date('2026-09-02T15:00:00Z'), // +25 hours (Day 1)
			properties: {
				challenge_type: 'quick',
				is_guest: true,
				session_id: '00000000-0000-4000-8000-000000000004'
			}
		});

		// Actor C: plays challenge on Day 0 (Sep 1, 18:00), never plays again
		await service.track({
			distinctId: 'user-c',
			event: 'challenge_started',
			timestamp: new Date('2026-09-01T18:00:00Z'),
			properties: {
				challenge_type: 'quick',
				is_guest: true,
				session_id: '00000000-0000-4000-8000-000000000005'
			}
		});

		// Actor D: only views landing page on Day 0 and returns to view landing on Day 1
		// MUST NOT be counted in meaningful challenge retention cohort!
		await service.track({
			distinctId: 'user-d',
			event: 'landing_view',
			timestamp: new Date('2026-09-01T12:00:00Z')
		});
		await service.track({
			distinctId: 'user-d',
			event: 'landing_view',
			timestamp: new Date('2026-09-02T14:00:00Z')
		});

		const retention = await service.getRetention({
			cohortStartDate: cohortStart,
			cohortEndDate: cohortEnd
		});

		// Only user-a, user-b, user-c entered meaningful challenge cohort
		expect(retention.cohortSize).toBe(3);
		expect(retention.d1Count).toBe(2); // user-a, user-b
		expect(retention.d1Rate).toBe(0.667); // 2/3
		expect(retention.d7Count).toBe(1); // user-a
		expect(retention.d7Rate).toBe(0.333); // 1/3
	});
});
