import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory browser mocks for Node environment
class MockLocalStorage {
	private store = new Map<string, string>();
	getItem(key: string) {
		return this.store.get(key) ?? null;
	}
	setItem(key: string, value: string) {
		this.store.set(key, value);
	}
	removeItem(key: string) {
		this.store.delete(key);
	}
	clear() {
		this.store.clear();
	}
}

const mockLocalStorage = new MockLocalStorage();
let mockCookie = '';
const mockSendBeacon = vi.fn();

// Polyfill globals for Node runner
Object.defineProperty(globalThis, 'localStorage', {
	value: mockLocalStorage,
	configurable: true,
	writable: true
});

Object.defineProperty(globalThis, 'document', {
	value: {
		get cookie() {
			return mockCookie;
		},
		set cookie(val: string) {
			mockCookie = val;
		}
	},
	configurable: true,
	writable: true
});

Object.defineProperty(globalThis, 'navigator', {
	value: {
		sendBeacon: mockSendBeacon
	},
	configurable: true,
	writable: true
});

// @ts-expect-error - node mock
globalThis.Blob = class MockBlob {
	constructor(
		public parts: unknown[],
		public options?: unknown
	) {}
};

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: true
}));

import { analytics, getClientDistinctId } from './analytics';

describe('Client Analytics Tracker', () => {
	beforeEach(() => {
		mockLocalStorage.clear();
		mockCookie = '';
		mockSendBeacon.mockReset();
		vi.restoreAllMocks();
	});

	it('generates and persists a distinct ID', () => {
		const id1 = getClientDistinctId();
		expect(id1).toBeTruthy();
		expect(id1.length).toBeGreaterThanOrEqual(8);

		const id2 = getClientDistinctId();
		expect(id2).toBe(id1);
		expect(analytics.getDistinctId()).toBe(id1);
	});

	it('sends beacon or fetch with sanitized payload', async () => {
		mockSendBeacon.mockReturnValue(true);

		await analytics.track('landing_view', {
			locale: 'en',
			referrer: 'https://example.com'
		});

		expect(mockSendBeacon).toHaveBeenCalledWith('/api/analytics/event', expect.any(String));
	});

	it('swallows errors when fetch or sendBeacon fails (e.g. ad blocker)', async () => {
		Object.defineProperty(globalThis, 'navigator', {
			value: {},
			configurable: true,
			writable: true
		});
		globalThis.fetch = vi.fn().mockRejectedValue(new Error('Blocked by client (ad blocker)'));

		// Should not throw or crash
		await expect(
			analytics.track('landing_view', {
				locale: 'en'
			})
		).resolves.toBeUndefined();
	});

	it('gracefully ignores non-canonical events', async () => {
		const fetchSpy = vi.fn();
		globalThis.fetch = fetchSpy;
		Object.defineProperty(globalThis, 'navigator', {
			value: {},
			configurable: true,
			writable: true
		});

		// @ts-expect-error - testing invalid event
		await analytics.track('fake_event', {});
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
