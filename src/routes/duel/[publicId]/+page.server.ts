import type { PageServerLoad } from './$types';
import { createDuelService, toAnalyticsDuelId } from '$lib/server/duel/duel-service';
import { getAppOrigin } from '$lib/server/share/share-service';
import { throwPageLoadError } from '$lib/server/page-error';

export const load: PageServerLoad = async (event) => {
	try {
		const rawParam = event.params.publicId;
		const publicId = rawParam.endsWith('.png') ? rawParam.slice(0, -4) : rawParam;

		const duelService = createDuelService();
		const duelView = await duelService.getDuelPublicView(event, publicId);
		const appOrigin = getAppOrigin(event);

		return {
			duelView,
			appOrigin,
			analyticsDuelId: toAnalyticsDuelId(publicId)
		};
	} catch (caught) {
		throwPageLoadError(caught, event.locals.locale);
	}
};
