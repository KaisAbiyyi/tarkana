import type { PageServerLoad } from './$types';
import { QUESTION_TYPES } from '$lib/shared/constants/challenge';

export const load: PageServerLoad = async () => {
	return {
		questionTypes: QUESTION_TYPES
	};
};
