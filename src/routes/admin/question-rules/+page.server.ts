import type { Actions, PageServerLoad } from './$types';
import { createAdminService } from '$lib/server/admin/admin-service';
import { actionFailure, checkboxValue, optionalJsonObject } from '$lib/server/admin/form-input';

export const load: PageServerLoad = async (event) => {
	const service = createAdminService();
	const [categories, rules] = await Promise.all([
		service.listCategories(event, { limit: 100, offset: 0 }),
		service.listQuestionRules(event, { limit: 100, offset: 0 })
	]);

	return { categories, rules };
};

export const actions: Actions = {
	saveRule: async (event) => {
		const form = await event.request.formData();
		try {
			await createAdminService().saveQuestionRule(event, {
				categoryId: form.get('categoryId'),
				ruleType: form.get('ruleType'),
				difficultyMin: form.get('difficultyMin'),
				difficultyMax: form.get('difficultyMax'),
				timeLimitSeconds: form.get('timeLimitSeconds'),
				config: optionalJsonObject(form, 'config') ?? {},
				isActive: checkboxValue(form, 'isActive')
			});
			return { message: 'Question rule saved.' };
		} catch (error) {
			return actionFailure(
				error instanceof Error ? error.message : 'Question rule could not be saved.'
			);
		}
	}
};
