import type { Actions, PageServerLoad } from './$types';
import { createAdminService } from '$lib/server/admin/admin-service';
import { actionFailure, checkboxValue } from '$lib/server/admin/form-input';
import { translate } from '$lib/i18n';

export const load: PageServerLoad = async (event) => {
	return {
		categories: await createAdminService().listCategories(event, { limit: 100, offset: 0 })
	};
};

export const actions: Actions = {
	saveCategory: async (event) => {
		const form = await event.request.formData();
		try {
			await createAdminService().saveCategory(event, {
				name: form.get('name'),
				slug: form.get('slug'),
				description: form.get('description'),
				isActive: checkboxValue(form, 'isActive')
			});
			return { message: translate(event.locals.locale, 'admin.saved') };
		} catch {
			return actionFailure(translate(event.locals.locale, 'admin.saveFailed'));
		}
	}
};
