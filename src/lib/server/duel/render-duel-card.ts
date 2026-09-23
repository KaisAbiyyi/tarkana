import { Resvg } from '@resvg/resvg-js';
import type { ChallengeType } from '$lib/shared/constants/challenge';

export interface RenderDuelCardOptions {
	creatorDisplayName: string;
	sourceChallengeType: ChallengeType;
	totalQuestions: number;
	appOrigin?: string;
}

function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function renderDuelCardSvg(options: RenderDuelCardOptions): string {
	const displayName = escapeXml(options.creatorDisplayName || 'A player');
	const typeUpper = (options.sourceChallengeType || 'standard').toUpperCase();
	const modeLabel = `${typeUpper} LOGIC`;
	const questionCountText = `${options.totalQuestions || 10} PUZZLES`;

	const host = (() => {
		try {
			if (options.appOrigin) return new URL(options.appOrigin).host.toUpperCase();
		} catch {
			/* ignore */
		}
		return 'TARKANA.APP';
	})();

	return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
	<!-- Background -->
	<rect width="1200" height="630" fill="#fff8ea" />

	<!-- Outer Border Frame with Shadow -->
	<rect x="30" y="30" width="1146" height="576" rx="12" fill="#1c1917" />
	<rect x="24" y="24" width="1146" height="576" rx="12" fill="#fffdfa" stroke="#1c1917" stroke-width="4" />

	<!-- Header Area -->
	<g transform="translate(60, 60)">
		<!-- Brand Pill -->
		<rect x="0" y="0" width="170" height="42" rx="4" fill="#f59e0b" stroke="#1c1917" stroke-width="3" />
		<text x="85" y="28" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" fill="#1c1917" text-anchor="middle" letter-spacing="2">TARKANA</text>

		<!-- Subtitle / Mode -->
		<text x="190" y="28" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="18" fill="#78716c" letter-spacing="1">ASYNC LOGIC DUEL</text>
	</g>

	<!-- Invitation Title -->
	<g transform="translate(60, 135)">
		<text x="0" y="36" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="38" fill="#1c1917">
			${displayName} challenged you to a duel!
		</text>
		<text x="0" y="74" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" fill="#78716c">
			Can you solve the exact same puzzles faster and more accurately?
		</text>
	</g>

	<!-- Feature / Stat Cards Row -->
	<!-- Mode Card -->
	<g transform="translate(60, 240)">
		<rect x="6" y="6" width="330" height="190" rx="8" fill="#1c1917" />
		<rect x="0" y="0" width="330" height="190" rx="8" fill="#fde047" stroke="#1c1917" stroke-width="4" />
		<text x="24" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="15" fill="#854d0e" letter-spacing="1">CHALLENGE MODE</text>
		<text x="24" y="110" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#1c1917">${modeLabel}</text>
		<text x="24" y="152" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#854d0e">Timed Reasoning</text>
	</g>

	<!-- Benchmark Set Card -->
	<g transform="translate(425, 240)">
		<rect x="6" y="6" width="330" height="190" rx="8" fill="#1c1917" />
		<rect x="0" y="0" width="330" height="190" rx="8" fill="#ffffff" stroke="#1c1917" stroke-width="4" />
		<text x="24" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="15" fill="#78716c" letter-spacing="1">BENCHMARK SET</text>
		<text x="24" y="110" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="36" fill="#1c1917">${questionCountText}</text>
		<text x="24" y="152" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#16a34a">Identical Puzzle Snapshot</text>
	</g>

	<!-- Blind Duel Secrecy Card -->
	<g transform="translate(790, 240)">
		<rect x="6" y="6" width="330" height="190" rx="8" fill="#1c1917" />
		<rect x="0" y="0" width="330" height="190" rx="8" fill="#ffffff" stroke="#1c1917" stroke-width="4" />
		<text x="24" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="15" fill="#78716c" letter-spacing="1">TARGET BENCHMARK</text>
		<text x="24" y="110" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="36" fill="#2563eb">LOCKED</text>
		<text x="24" y="152" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#78716c">Revealed after you finish</text>
	</g>

	<!-- Footer Callout Bar -->
	<g transform="translate(60, 490)">
		<rect width="1060" height="60" rx="8" fill="#1c1917" />
		<text x="530" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" fill="#fde047" text-anchor="middle" letter-spacing="1.5">
			ACCEPT THE DUEL &amp; MATCH SCORES • PLAY NOW AT ${host}
		</text>
	</g>
</svg>
	`.trim();
}

export function renderDuelCardPng(options: RenderDuelCardOptions): Buffer {
	const svg = renderDuelCardSvg(options);
	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: 1200 }
	});
	return resvg.render().asPng();
}
