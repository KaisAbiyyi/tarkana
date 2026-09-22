import type { RequestEvent } from '@sveltejs/kit';
import { getOptionalProfile } from '$lib/server/auth/guards';
import { getGuestToken } from '$lib/server/sessions/guest-token';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import { toActiveQuestionDto } from '$lib/server/sessions/dto';

export type ActiveChallengeResult = {
	hasActive: boolean;
	isComplete?: boolean;
	sessionId?: string;
	totalQuestions?: number;
	currentQuestion?: ReturnType<typeof toActiveQuestionDto> | null;
	challengeType?: string;
	isGuest?: boolean;
};

export type ActiveChallengeService = {
	getActive(event: RequestEvent): Promise<ActiveChallengeResult>;
};

export function createActiveChallengeService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository(),
	now: () => Date = () => new Date()
): ActiveChallengeService {
	return {
		async getActive(event) {
			const profile = await getOptionalProfile(event, profileRepository);
			const isGuest = !profile;

			let session;
			if (profile) {
				session = await sessionRepository.findActiveSession(profile.id);
			} else {
				const guestToken = getGuestToken(event);
				session = guestToken ? await sessionRepository.findActiveGuestSession(guestToken) : null;
			}

			if (!session) {
				return { hasActive: false };
			}

			const MS_PER_HOUR = 60 * 60 * 1000;
			const hoursSinceUpdate = (now().getTime() - session.updatedAt.getTime()) / MS_PER_HOUR;

			if (hoursSinceUpdate > 24) {
				await sessionRepository.abandonSession(session.id);
				return { hasActive: false };
			}

			const [questions, answers] = await Promise.all([
				sessionRepository.listSessionQuestions(session.id),
				sessionRepository.listSessionAnswers(session.id, profile?.id)
			]);

			const answeredQuestionIds = new Set(answers.map((answer) => answer.sessionQuestionId));
			const currentQuestion = questions.find((item) => !answeredQuestionIds.has(item.id));

			if (!currentQuestion) {
				return {
					hasActive: true,
					isComplete: true,
					sessionId: session.id,
					challengeType: session.challengeType,
					isGuest
				};
			}

			return {
				hasActive: true,
				isComplete: false,
				sessionId: session.id,
				totalQuestions: questions.length,
				currentQuestion: toActiveQuestionDto(currentQuestion),
				challengeType: session.challengeType,
				isGuest
			};
		}
	};
}
