import type { RequestHandler } from './$types';
import { jsonError, jsonOk, readJsonBody, requireObjectBody } from '$lib/server/api/response';
import { createFinishChallengeService } from '$lib/server/sessions/finish-challenge-service';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { requireUuid } from '$lib/shared/validation/common';
import { ValidationError } from '$lib/shared/validation/common';

export const POST: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		const user = await event.locals.getUser();
		const rateLimitKey = user
			? `user:${user.id}:challenge-finish`
			: `ip:${clientIp}:challenge-finish`;
		enforceRateLimit(rateLimitKey, { maxRequests: 20, windowMs: 60 * 1000 });

		const input = await readJsonBody(event, (body) => {
			const data = requireObjectBody(body);
			return {
				sessionId: requireUuid(data.sessionId, 'sessionId'),
				tabSwitchCount: parseOptionalNonNegativeInteger(data.tabSwitchCount, 'tabSwitchCount'),
				requestAnomalyFlags: parseOptionalStringArray(data.requestAnomalyFlags)
			};
		});
		return jsonOk(await createFinishChallengeService().finish(event, input));
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};

function parseOptionalNonNegativeInteger(value: unknown, fieldName: string): number | undefined {
	if (value === undefined || value === null) return undefined;
	const parsed = typeof value === 'string' ? Number(value) : value;
	if (!Number.isInteger(parsed) || Number(parsed) < 0) {
		throw new ValidationError(`${fieldName} must be zero or greater`);
	}
	return Number(parsed);
}

function parseOptionalStringArray(value: unknown): string[] | undefined {
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
		throw new ValidationError('requestAnomalyFlags must be an array of strings');
	}
	return value;
}
