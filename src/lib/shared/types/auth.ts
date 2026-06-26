import type { UserRole } from '$lib/shared/constants/auth';
import type { RankName } from '$lib/shared/constants/rank';

export type AuthenticatedUser = {
	id: string;
	email: string | null;
};

export type ProfileSummary = {
	id: string;
	displayName: string;

	role: UserRole;
	rating: number;
	rank: RankName;
};
