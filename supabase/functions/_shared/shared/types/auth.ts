import type { UserRole } from '../../shared/constants/auth.ts';
import type { RankName } from '../../shared/constants/rank.ts';

export type AuthenticatedUser = {
	id: string;
	email: string | null;
};

export type ProfileSummary = {
	id: string;
	displayName: string;
	publicDiscriminator: string;
	role: UserRole;
	rating: number;
	rank: RankName;
};
