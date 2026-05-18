import { json, type RequestEvent } from '@sveltejs/kit';
import { apiFailure, apiSuccess, type ApiResponse } from '$lib/shared/types/api';
import { ValidationError } from '$lib/shared/validation/common';
import { AppError, badRequest, toSafeError } from '$lib/server/errors';

export function jsonOk<T>(data: T): Response {
	return json(apiSuccess(data) satisfies ApiResponse<T>);
}

export function jsonError(error: unknown): Response {
	const safeError =
		error instanceof ValidationError ? badRequest(error.message) : toSafeError(error);

	return json(apiFailure(safeError.code, safeError.message), { status: safeError.status });
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
