import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
import { createSubmitAnswerService } from '$lib/server/sessions/submit-answer-service';
import { requireUuid } from '$lib/shared/validation/common';
import { ValidationError } from '$lib/shared/validation/common';

export const POST: RequestHandler = async (event) => {
	try {
		const input = await readJsonBody(event, (body) => {
			const data = requireObjectBody(body);
			return {
				sessionId: requireUuid(data.sessionId, 'sessionId'),
				sessionQuestionId: requireUuid(data.sessionQuestionId, 'sessionQuestionId'),
				selectedAnswer: parseSelectedAnswer(data.selectedAnswer),
				timeSpentSeconds: parseTimeSpent(data.timeSpentSeconds)
			};
		});
		return jsonOk(await createSubmitAnswerService().submit(event, input));
	} catch (error) {
		return jsonError(error);
	}
};

function parseSelectedAnswer(value: unknown): string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new ValidationError('selectedAnswer is required');
	}
	return value;
}

function parseTimeSpent(value: unknown): number {
	const timeSpent = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(timeSpent) || Number(timeSpent) < 0) {
		throw new ValidationError('timeSpentSeconds must be zero or greater');
	}
	return Number(timeSpent);
}
