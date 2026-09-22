import { describe, expect, it } from 'vitest';
import { createClaimGuestService } from './claim-guest-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import { createChallengeSession, createSessionRepositoryFake } from './test-fakes';

describe('claim guest service', () => {
	it('claims an unclaimed guest session for authenticated user and updates rating', async () => {
		const guestToken = 'guest-token-123456789012345678901234567890123456789012345678901234567890';
		const profile = createProfile({ rating: 100, rank: 'Bronze Mind' });
		const session = createChallengeSession({
			userId: null,
			guestToken,
			status: 'completed',
			totalScore: 150,
			accuracy: 100,
			ratingDelta: 40
		});
		const repository = createSessionRepositoryFake({ session });
		const service = createClaimGuestService(repository, createProfileRepositoryFake(profile));

		const event = createFakeEvent(createFakeUser({ id: profile.id }), {
			tarkana_guest_token: guestToken
		});
		const result = await service.claim(event, { sessionId: session.id });

		expect(result.success).toBe(true);
		expect(result.sessionId).toBe(session.id);
		expect(result.alreadyClaimed).toBe(false);
		expect(event.cookies.get('tarkana_guest_token')).toBeUndefined();
	});

	it('is idempotent if session was already claimed by the same user', async () => {
		const guestToken = 'guest-token-123456789012345678901234567890123456789012345678901234567890';
		const profile = createProfile({ rating: 100, rank: 'Bronze Mind' });
		const session = createChallengeSession({
			userId: profile.id,
			guestToken,
			claimedAt: new Date(),
			status: 'completed'
		});
		const repository = createSessionRepositoryFake({ session });
		const service = createClaimGuestService(repository, createProfileRepositoryFake(profile));

		const event = createFakeEvent(createFakeUser({ id: profile.id }), {
			tarkana_guest_token: guestToken
		});
		const result = await service.claim(event, { sessionId: session.id });

		expect(result.alreadyClaimed).toBe(true);
	});

	it('rejects claim if caller is unauthenticated', async () => {
		const service = createClaimGuestService(
			createSessionRepositoryFake(),
			createProfileRepositoryFake(null)
		);

		await expect(
			service.claim(createFakeEvent(null), {
				sessionId: '11111111-1111-4111-8111-111111111111'
			})
		).rejects.toMatchObject({ status: 401 });
	});

	it('rejects claim if guest token is missing', async () => {
		const profile = createProfile();
		const service = createClaimGuestService(
			createSessionRepositoryFake(),
			createProfileRepositoryFake(profile)
		);

		await expect(
			service.claim(createFakeEvent(createFakeUser({ id: profile.id })), {
				sessionId: '11111111-1111-4111-8111-111111111111'
			})
		).rejects.toMatchObject({ status: 400 });
	});
});
