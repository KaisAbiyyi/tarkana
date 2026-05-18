export type AppErrorCode =
	| 'bad_request'
	| 'unauthorized'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	| 'internal_error';

export class AppError extends Error {
	constructor(
		readonly status: number,
		readonly code: AppErrorCode,
		message: string
	) {
		super(message);
		this.name = 'AppError';
	}
}

export const badRequest = (message: string): AppError => new AppError(400, 'bad_request', message);
export const unauthorized = (message = 'Authentication is required'): AppError =>
	new AppError(401, 'unauthorized', message);
export const forbidden = (message = 'Access is forbidden'): AppError =>
	new AppError(403, 'forbidden', message);
export const notFound = (message = 'Resource was not found'): AppError =>
	new AppError(404, 'not_found', message);
export const conflict = (message: string): AppError => new AppError(409, 'conflict', message);

export function toSafeError(error: unknown): AppError {
	if (error instanceof AppError) return error;
	return new AppError(500, 'internal_error', 'Something went wrong');
}
