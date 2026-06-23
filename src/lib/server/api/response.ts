import { json, type RequestEvent } from '@sveltejs/kit';
import { apiFailure, apiSuccess, type ApiResponse } from '$lib/shared/types/api';
import { ValidationError } from '$lib/shared/validation/common';
import { AppError, badRequest, toSafeError } from '$lib/server/errors';
import { DEFAULT_LOCALE, translate, type Locale } from '$lib/i18n';

export function jsonOk<T>(data: T): Response {
	return json(apiSuccess(data) satisfies ApiResponse<T>);
}

export function jsonError(error: unknown, locale: Locale = DEFAULT_LOCALE): Response {
	const safeError =
		error instanceof ValidationError ? badRequest(error.message) : toSafeError(error);
	const message =
		safeError.status === 404
			? translate(locale, 'error.notFound')
			: safeError.status === 401 || safeError.status === 403
				? translate(locale, 'error.accessDenied')
				: safeError.status < 500
					? translate(locale, 'error.invalidRequest')
					: translate(locale, 'error.generic');

	return json(apiFailure(safeError.code, message), { status: safeError.status });
}

export async function readJsonBody<T>(
	event: RequestEvent,
	parse: (body: unknown) => T | Promise<T>
): Promise<T> {
	let body: unknown;

	try {
		body = await event.request.json();
	} catch {
		throw badRequest('Request body must be valid JSON');
	}

	return parse(body);
}

export function requireObjectBody(body: unknown): Record<string, unknown> {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) {
		throw badRequest('Request body must be an object');
	}

	return body as Record<string, unknown>;
}

export function assertNeverAppError(error: never): AppError {
	return error;
}
