import type { Actions, PageServerLoad } from './$types';
import { createAdminService } from '$lib/server/admin/admin-service';
import { actionFailure, checkboxValue, optionalJsonObject } from '$lib/server/admin/form-input';
import { translate } from '$lib/i18n';

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
			return { message: translate(event.locals.locale, 'admin.saved') };
		} catch {
			return actionFailure(translate(event.locals.locale, 'admin.saveFailed'));
		}
	}
};
