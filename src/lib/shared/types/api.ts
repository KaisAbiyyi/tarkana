export type ApiErrorCode =
	| 'bad_request'
	| 'unauthorized'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	| 'internal_error';

export type ApiSuccess<T> = {
	ok: true;
	data: T;
};

export type ApiFailure = {
	ok: false;
	error: {
		code: ApiErrorCode;
		message: string;
	};
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
	return { ok: true, data };
}

export function apiFailure(code: ApiErrorCode, message: string): ApiFailure {
	return { ok: false, error: { code, message } };
}
