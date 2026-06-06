import { error as httpError } from '@sveltejs/kit';
import { AppError } from '$lib/server/errors';

export function throwPageLoadError(caught: unknown): never {
	if (caught instanceof AppError) {
		httpError(caught.status, caught.status < 500 ? caught.message : 'Something went wrong');
	}

	throw caught;
}
