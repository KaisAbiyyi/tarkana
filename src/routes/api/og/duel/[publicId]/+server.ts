import type { RequestHandler } from './$types';
import { createDuelService } from '$lib/server/duel/duel-service';
import { getAppOrigin } from '$lib/server/share/share-service';
import { renderDuelCardPng } from '$lib/server/duel/render-duel-card';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { jsonError } from '$lib/server/api/response';

export const GET: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		await enforceRateLimit(`ip:${clientIp}:og-duel`, { maxRequests: 60, windowMs: 60 * 1000 });

		const rawParam = event.params.publicId;
		const publicId = rawParam.endsWith('.png') ? rawParam.slice(0, -4) : rawParam;

		const duelService = createDuelService();
		const view = await duelService.getDuelPublicView(event, publicId);
		const appOrigin = getAppOrigin(event);

		const pngBuffer = renderDuelCardPng({
			creatorDisplayName: view.creatorDisplayName,
			sourceChallengeType: view.sourceChallengeType,
			totalQuestions: view.totalQuestions,
			appOrigin
		});

		const headers = new Headers({
			'Content-Type': 'image/png',
			'Content-Length': pngBuffer.byteLength.toString(),
			'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
		});

		if (event.url.searchParams.get('download') === '1') {
			headers.set('Content-Disposition', `attachment; filename="tarkana-duel-${publicId}.png"`);
		}

		return new Response(new Uint8Array(pngBuffer), {
			status: 200,
			headers
		});
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
