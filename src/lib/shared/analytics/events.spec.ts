import { describe, expect, it } from 'vitest';
import {
	CANONICAL_EVENTS,
	isCanonicalEvent,
	sanitizeEventProperties,
	EVENT_PROPERTY_ALLOWLIST
} from './events';

describe('Analytics Events & Zero-PII Sanitizer', () => {
	it('defines all 12 required canonical events', () => {
		const required = [
			'landing_view',
			'challenge_started',
			'first_question_seen',
			'question_answered',
			'challenge_completed',
			'challenge_abandoned',
			'claim_cta_viewed',
			'signup_started',
			'signup_completed',
			'guest_claim_succeeded',
			'result_shared',
			'return_visit'
		];

		for (const ev of required) {
			expect(CANONICAL_EVENTS).toContain(ev);
			expect(isCanonicalEvent(ev)).toBe(true);
			expect(EVENT_PROPERTY_ALLOWLIST[ev as keyof typeof EVENT_PROPERTY_ALLOWLIST]).toBeDefined();
		}

		expect(isCanonicalEvent('unregistered_custom_event')).toBe(false);
	});

	it('strictly rejects non-canonical events', () => {
		expect(() =>
			// @ts-expect-error - testing invalid event name
			sanitizeEventProperties('fake_event', {})
		).toThrow(/Invalid analytics event/i);
	});

	it('strips non-allowlisted properties in default mode', () => {
		const sanitized = sanitizeEventProperties('challenge_completed', {
			session_id: '123e4567-e89b-12d3-a456-426614174000',
			challenge_type: 'quick',
			total_score: 180,
			accuracy: 1.0,
			total_time_seconds: 45,
			is_guest: true,
			extra_unauthorized_field: 'should_be_stripped',
			internal_debug_info: { memory: 1024 }
		});

		expect(sanitized).toEqual({
			session_id: '123e4567-e89b-12d3-a456-426614174000',
			challenge_type: 'quick',
			total_score: 180,
			accuracy: 1.0,
			total_time_seconds: 45,
			is_guest: true
		});
		expect(sanitized).not.toHaveProperty('extra_unauthorized_field');
		expect(sanitized).not.toHaveProperty('internal_debug_info');
	});

	describe('Zero-PII Protection', () => {
		it('strips keys containing password, token, secret, email, phone, credit card', () => {
			const sanitized = sanitizeEventProperties('signup_started', {
				source: 'claim_banner',
				user_password: 'supersecretpassword',
				auth_token: 'jwt-token-value',
				guestToken: 'guest-secret-token',
				user_email: 'user@example.com',
				phone_number: '1234567890',
				credit_card: '4111222233334444'
			});

			expect(sanitized).toEqual({
				source: 'claim_banner'
			});
			expect(sanitized).not.toHaveProperty('user_password');
			expect(sanitized).not.toHaveProperty('auth_token');
			expect(sanitized).not.toHaveProperty('guestToken');
			expect(sanitized).not.toHaveProperty('user_email');
		});

		it('strips values containing embedded email addresses', () => {
			const sanitized = sanitizeEventProperties('landing_view', {
				locale: 'en',
				referrer: 'https://google.com/?ref=user@example.com'
			});

			expect(sanitized).toEqual({
				locale: 'en'
			});
			expect(sanitized).not.toHaveProperty('referrer');
		});

		it('throws in strict mode when PII or forbidden keys are present', () => {
			expect(() =>
				sanitizeEventProperties(
					'challenge_started',
					{
						session_id: '123',
						challenge_type: 'quick',
						is_guest: true,
						guest_token: 'secret123'
					},
					{ strict: true }
				)
			).toThrow(/PII \/ forbidden key detected/i);

			expect(() =>
				sanitizeEventProperties(
					'landing_view',
					{
						locale: 'en',
						referrer: 'user@evil.com'
					},
					{ strict: true }
				)
			).toThrow(/Potential email address detected/i);
		});

		it('caps oversized string properties at 256 characters', () => {
			const longStr = 'a'.repeat(500);
			const sanitized = sanitizeEventProperties('landing_view', {
				referrer: longStr
			});

			expect((sanitized.referrer as string).length).toBe(256);
		});
	});
});
