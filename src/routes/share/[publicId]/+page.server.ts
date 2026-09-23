import type { PageServerLoad } from './$types';
import { createShareService, getAppOrigin } from '$lib/server/share/share-service';
import { throwPageLoadError } from '$lib/server/page-error';

export const load: PageServerLoad = async (event) => {
	try {
		const rawParam = event.params.publicId;
		const publicId = rawParam.endsWith('.png') ? rawParam.slice(0, -4) : rawParam;

		const shareService = createShareService();
		const shareResult = await shareService.getPublicShare(publicId);
		const appOrigin = getAppOrigin(event);

		return {
			shareResult,
			appOrigin
		};
	} catch (caught) {
		throwPageLoadError(caught, event.locals.locale);
	}
};
