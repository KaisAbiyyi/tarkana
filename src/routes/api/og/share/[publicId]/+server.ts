import type { RequestHandler } from './$types';
import { createShareService, getAppOrigin } from '$lib/server/share/share-service';
import { renderShareCardPng } from '$lib/server/share/render-card';
import { enforceRateLimit } from '$lib/server/security/rate-limit';
import { jsonError } from '$lib/server/api/response';

export const GET: RequestHandler = async (event) => {
	try {
		const clientIp =
			typeof event.getClientAddress === 'function' ? event.getClientAddress() : '127.0.0.1';
		await enforceRateLimit(`ip:${clientIp}:og-share`, { maxRequests: 60, windowMs: 60 * 1000 });

		const rawParam = event.params.publicId;
		const publicId = rawParam.endsWith('.png') ? rawParam.slice(0, -4) : rawParam;

		const shareService = createShareService();
		const publicShare = await shareService.getPublicShare(publicId);
		const appOrigin = getAppOrigin(event);

		const pngBuffer = renderShareCardPng(publicShare, appOrigin);

		const headers = new Headers({
			'Content-Type': 'image/png',
			'Content-Length': pngBuffer.byteLength.toString(),
			'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
		});

		if (event.url.searchParams.get('download') === '1') {
			headers.set('Content-Disposition', `attachment; filename="tarkana-${publicId}.png"`);
		}

		return new Response(new Uint8Array(pngBuffer), {
			status: 200,
			headers
		});
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
