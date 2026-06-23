import { describe, expect, it } from 'vitest';
import { badRequest } from '$lib/server/errors';
import { throwPageLoadError } from '$lib/server/page-error';

describe('throwPageLoadError', () => {
	it('converts safe app errors to SvelteKit HTTP errors', () => {
		try {
			throwPageLoadError(badRequest('Challenge cannot be finished yet'));
			throw new Error('Expected throwPageLoadError to throw');
		} catch (caught) {
			expect(caught).toMatchObject({
				status: 400,
				body: { message: 'The request could not be processed. Check your input and try again.' }
			});
		}
	});

	it('rethrows unknown errors unchanged', () => {
		const error = new Error('database unavailable');

		expect(() => throwPageLoadError(error)).toThrow(error);
	});
});
