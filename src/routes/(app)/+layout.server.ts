import type { LayoutServerLoad } from './$types';
import { getOptionalProfile } from '$lib/server/auth/guards';

export const load: LayoutServerLoad = async (event) => {
	const profile = await getOptionalProfile(event);
	return { profile };
};
