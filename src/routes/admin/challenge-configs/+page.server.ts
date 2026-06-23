import type { Actions, PageServerLoad } from './$types';
import { createAdminService } from '$lib/server/admin/admin-service';
import { actionFailure, checkboxValue, optionalJsonObject } from '$lib/server/admin/form-input';
import { translate } from '$lib/i18n';

export const load: PageServerLoad = async (event) => {
	return {
		configs: await createAdminService().listChallengeConfigs(event, { limit: 100, offset: 0 })
	};
};

export const actions: Actions = {
	saveConfig: async (event) => {
		const form = await event.request.formData();
		try {
			await createAdminService().saveChallengeConfig(event, {
				name: form.get('name'),
				challengeType: form.get('challengeType'),
				questionCount: form.get('questionCount'),
				modeDistribution: optionalJsonObject(form, 'modeDistribution'),
				difficultyDistribution: optionalJsonObject(form, 'difficultyDistribution'),
				isActive: checkboxValue(form, 'isActive')
			});
			return { message: translate(event.locals.locale, 'admin.saved') };
		} catch {
			return actionFailure(translate(event.locals.locale, 'admin.saveFailed'));
		}
	}
};
