import { fail, type ActionFailure } from '@sveltejs/kit';

export type AdminActionFailure = ActionFailure<{ message: string }>;

export function checkboxValue(form: FormData, name: string): boolean {
	return form.get(name) === 'on';
}

export function optionalJsonObject(form: FormData, name: string): Record<string, unknown> | null {
	const value = String(form.get(name) ?? '').trim();
	if (!value) return null;

	const parsed = JSON.parse(value) as unknown;
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`${name} must be a JSON object`);
	}

	return parsed as Record<string, unknown>;
}

export function actionFailure(message: string): AdminActionFailure {
	return fail(400, { message });
}
