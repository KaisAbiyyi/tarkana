import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createProfileService } from '$lib/server/profile/profile-service';

import { createSessionRepository } from '$lib/server/db/repositories/session-repository';
import { translate } from '$lib/i18n';
import { QUESTION_TYPES } from '$lib/shared/constants/challenge';
import {
	MASTERY_PROVISIONAL_MIN_QUESTIONS,
	MASTERY_PROVISIONAL_MIN_SESSIONS,
	resolveInitialCategoryMasteryPrior
} from '$lib/server/scoring/mastery';
import type { UserCategoryMasterySummaryDto } from '$lib/shared/types/leaderboard';

export const load: PageServerLoad = async (event) => {
	const user = await event.locals.getUser();
	if (!user) redirect(303, '/auth/login');

	const profile = await createProfileService().getProfile(event);
	const sessionRepo = createSessionRepository();
	const [stats, rawMasteries] = await Promise.all([
		sessionRepo.getDashboardStats(profile.id),
		sessionRepo.listUserCategoryMastery(profile.id)
	]);

	const masteryMap = new Map(rawMasteries.map((m) => [m.questionType, m]));

	const categoryMasteries: UserCategoryMasterySummaryDto[] = QUESTION_TYPES.map((qType) => {
		const m = masteryMap.get(qType);
		if (m) {
			const totalQuestions = m.totalQuestions;
			const totalSessions = m.totalSessions;
			const isProvisional =
				totalQuestions < MASTERY_PROVISIONAL_MIN_QUESTIONS ||
				totalSessions < MASTERY_PROVISIONAL_MIN_SESSIONS;
			const accuracy =
				totalQuestions > 0 ? Math.round((m.correctAnswers / totalQuestions) * 1000) / 10 : 0;
			const qProgress = Math.min(1, totalQuestions / MASTERY_PROVISIONAL_MIN_QUESTIONS);
			const sProgress = Math.min(1, totalSessions / MASTERY_PROVISIONAL_MIN_SESSIONS);
			const progressPercent = Math.round(((qProgress + sProgress) / 2) * 100);

			return {
				questionType: qType,
				masteryRating: m.rating,
				accuracy,
				totalQuestions,
				totalSessions,
				isProvisional,
				progressPercent
			};
		}

		return {
			questionType: qType,
			masteryRating: resolveInitialCategoryMasteryPrior(profile.rating),
			accuracy: 0,
			totalQuestions: 0,
			totalSessions: 0,
			isProvisional: true,
			progressPercent: 0
		};
	});

	return {
		profile,
		user,
		stats: {
			totalCompleted: stats.totalCompleted,
			averageAccuracy: stats.averageAccuracy
		},
		categoryMasteries
	};
};

export const actions: Actions = {
	updateDisplayName: async (event) => {
		const form = await event.request.formData();
		const displayName = form.get('displayName');

		try {
			return {
				profile: await createProfileService().updateDisplayName(event, displayName),
				message: translate(event.locals.locale, 'profile.updated'),
				success: true
			};
		} catch {
			return fail(400, {
				message: translate(event.locals.locale, 'profile.invalidDisplayName'),
				success: false
			});
		}
	}
};
