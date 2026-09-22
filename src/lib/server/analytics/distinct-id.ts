import type { RequestEvent } from '@sveltejs/kit';

export const DISTINCT_ID_COOKIE = 'tarkana_distinct_id';

export function getOrSetDistinctId(event: RequestEvent, fallbackId?: string): string {
	const existing = event.cookies.get(DISTINCT_ID_COOKIE);
	if (existing && isValidDistinctId(existing)) {
		return existing;
	}

	const distinctId = fallbackId && isValidDistinctId(fallbackId) ? fallbackId : crypto.randomUUID();

	event.cookies.set(DISTINCT_ID_COOKIE, distinctId, {
		path: '/',
		httpOnly: false, // Accessible to client JS for analytics stitching
		sameSite: 'lax',
		secure: event.url?.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 365 // 1 year
	});

	return distinctId;
}

function isValidDistinctId(id: string): boolean {
	return typeof id === 'string' && id.length >= 8 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id);
}
