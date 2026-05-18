import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
import { createStartChallengeService } from '$lib/server/sessions/start-challenge-service';
import { parseChallengeType } from '$lib/shared/validation/common';
import { QUESTION_TYPES, type QuestionType } from '$lib/shared/constants/challenge';
import { ValidationError } from '$lib/shared/validation/common';

export const POST: RequestHandler = async (event) => {
	try {
		const input = await readJsonBody(event, (body) => {
			const data = requireObjectBody(body);
			return {
				challengeType: parseChallengeType(data.challengeType),
				selectedMode: parseOptionalQuestionType(data.selectedMode),
				seed: typeof data.seed === 'string' && data.seed.trim().length > 0 ? data.seed : undefined
			};
		});
		return jsonOk(await createStartChallengeService().start(event, input));
	} catch (error) {
		return jsonError(error);
	}
};

function parseOptionalQuestionType(value: unknown): QuestionType | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string' || !QUESTION_TYPES.includes(value as QuestionType)) {
		throw new ValidationError('selectedMode is invalid');
	}
	return value as QuestionType;
}
