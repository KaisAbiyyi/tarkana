import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
import type { ProfileSummary } from '$lib/shared/types/auth';
import { forbidden, unauthorized } from '$lib/server/errors';
import { provisionProfile } from '$lib/server/auth/profile-provisioning';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';

export async function requireUser(event: RequestEvent): Promise<User> {
	const user = await event.locals.getUser();
	if (!user) throw unauthorized();
	return user;
}

export async function requireProfile(
	event: RequestEvent,
	repository?: ProfileRepository
): Promise<ProfileSummary> {
	const user = await requireUser(event);
	const profile = await provisionProfile({ user, repository });
	event.locals.profile = profile;
	return profile;
}

export async function requireAdmin(
	event: RequestEvent,
	repository?: ProfileRepository
): Promise<ProfileSummary> {
	const profile = await requireProfile(event, repository);
	if (profile.role !== 'admin') throw forbidden('Admin access is required');
	return profile;
}

export function assertOwner(authenticatedUserId: string, resourceUserId: string): void {
	if (authenticatedUserId !== resourceUserId) {
		throw forbidden('You can only access your own data');
	}
}
