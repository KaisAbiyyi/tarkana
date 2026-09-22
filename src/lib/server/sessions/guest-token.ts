import { randomBytes } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';

export const GUEST_TOKEN_COOKIE = 'tarkana_guest_token';

export function generateGuestToken(): string {
	return randomBytes(32).toString('hex');
}

export function getGuestToken(event: RequestEvent): string | null {
	return event.cookies.get(GUEST_TOKEN_COOKIE) ?? null;
}

export function setGuestTokenCookie(event: RequestEvent, token: string): void {
	event.cookies.set(GUEST_TOKEN_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});
}

export function clearGuestTokenCookie(event: RequestEvent): void {
	event.cookies.delete(GUEST_TOKEN_COOKIE, { path: '/' });
}
