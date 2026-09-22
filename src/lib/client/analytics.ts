import { browser } from '$app/environment';
import {
	isCanonicalEvent,
	sanitizeEventProperties,
	type CanonicalEventName,
	type EventPropertyMap
} from '$lib/shared/analytics/events';

const STORAGE_KEY = 'tarkana_distinct_id';
const COOKIE_NAME = 'tarkana_distinct_id';

/**
 * Gets or creates a persistent client distinct ID stored in localStorage and cookies.
 */
export function getClientDistinctId(): string {
	if (!browser) return '';

	let id: string | null = null;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && /^[a-zA-Z0-9_-]{8,64}$/.test(stored)) {
			id = stored;
		}
	} catch {
		// localStorage might be disabled or restricted
	}

	if (!id) {
		try {
			const match = document.cookie.match(new RegExp(`(^|;\\s*)${COOKIE_NAME}=([^;]+)`));
			if (match && match[2] && /^[a-zA-Z0-9_-]{8,64}$/.test(match[2])) {
				id = match[2];
			}
		} catch {
			/* ignore */
		}
	}

	if (!id) {
		id = generateUuid();
	}

	try {
		localStorage.setItem(STORAGE_KEY, id);
	} catch {
		/* ignore */
	}

	try {
		document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=31536000; SameSite=Lax`;
	} catch {
		/* ignore */
	}

	return id;
}

/**
 * Safe, ad-blocker resilient client analytics tracker.
 */
export const analytics = {
	getDistinctId(): string {
		return getClientDistinctId();
	},

	async track<T extends CanonicalEventName>(
		event: T,
		properties?: EventPropertyMap[T] | Record<string, unknown>
	): Promise<void> {
		if (!browser) return;
		if (!isCanonicalEvent(event)) return;

		try {
			const distinctId = getClientDistinctId();
			const sanitizedProps = sanitizeEventProperties(event, properties ?? {});
			const eventId = generateUuid();

			const payload = JSON.stringify({
				id: eventId,
				distinctId,
				event,
				properties: sanitizedProps
			});

			if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
				const sent = navigator.sendBeacon('/api/analytics/event', payload);
				if (sent) return;
			}

			await fetch('/api/analytics/event', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: payload,
				keepalive: true
			});
		} catch {
			// Ad-blocker, offline state, or network errors are gracefully ignored
		}
	},

	reset(): void {
		if (!browser) return;
		try {
			localStorage.removeItem(STORAGE_KEY);
			document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
		} catch {
			/* ignore */
		}
	}
};

function generateUuid(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}
