import { Resvg } from '@resvg/resvg-js';
import type { PublicShareResultDto } from './share-service';

function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function renderShareCardSvg(share: PublicShareResultDto, appOrigin?: string): string {
	const isDaily = share.challengeType === 'daily';
	const typeUpper = (share.challengeType ?? 'standard').toUpperCase();
	const title = isDaily
		? `DAILY CHALLENGE • ${escapeXml(share.challengeDate ?? '')}`
		: `${typeUpper} LOGIC CHALLENGE`;
	const displayName = escapeXml(share.displayName);
	const scoreText = `${share.totalScore}`;
	const accuracyText = `${Math.round(share.accuracy)}%`;
	const timeText = `${share.totalTimeSeconds}s`;
	const rankText = escapeXml(share.logicRank);

	const host = (() => {
		try {
			if (appOrigin) return new URL(appOrigin).host.toUpperCase();
		} catch {
			/* ignore */
		}
		return 'TARKANA.APP';
	})();

	// Generate question tiles (max 10 displayed)
	const questionsToDisplay = share.questions.slice(0, 10);
	const tileWidth = 56;
	const tileGap = 16;
	const startX = 80;

	const tilesSvg = questionsToDisplay
		.map((q, idx) => {
			const x = startX + idx * (tileWidth + tileGap);
			const y = 430;
			const bg = q.isCorrect ? '#22c55e' : '#ef4444';
			const symbol = q.isCorrect ? '✓' : '✕';
			return `
				<g transform="translate(${x}, ${y})">
					<rect width="${tileWidth}" height="${tileWidth}" rx="4" fill="#1c1917" x="4" y="4" />
					<rect width="${tileWidth}" height="${tileWidth}" rx="4" fill="${bg}" stroke="#1c1917" stroke-width="3" />
					<text x="${tileWidth / 2}" y="${tileWidth / 2 + 8}" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">${symbol}</text>
				</g>
			`;
		})
		.join('\n');

	return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
	<!-- Background -->
	<rect width="1200" height="630" fill="#fff8ea" />

	<!-- Outer Border Frame -->
	<rect x="24" y="24" width="1152" height="582" rx="12" fill="#fffdfa" stroke="#1c1917" stroke-width="4" />

	<!-- Header Area -->
	<g transform="translate(60, 60)">
		<!-- Brand Pill -->
		<rect x="0" y="0" width="170" height="42" rx="4" fill="#f59e0b" stroke="#1c1917" stroke-width="3" />
		<text x="85" y="28" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" fill="#1c1917" text-anchor="middle" letter-spacing="2">TARKANA</text>

		<!-- Subtitle / Mode -->
		<text x="190" y="28" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="18" fill="#78716c" letter-spacing="1">${title}</text>
	</g>

	<!-- Player Title -->
	<g transform="translate(60, 135)">
		<text x="0" y="32" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="36" fill="#1c1917">
			${displayName} completed the challenge!
		</text>
	</g>

	<!-- Stat Cards Row -->
	<!-- Score Card -->
	<g transform="translate(60, 200)">
		<rect x="6" y="6" width="330" height="170" rx="8" fill="#1c1917" />
		<rect x="0" y="0" width="330" height="170" rx="8" fill="#fde047" stroke="#1c1917" stroke-width="4" />
		<text x="24" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="15" fill="#1c1917" letter-spacing="1">REASONING SCORE</text>
		<text x="24" y="125" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64" fill="#1c1917">${scoreText}</text>
		<text x="240" y="125" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="24" fill="#854d0e">PTS</text>
	</g>

	<!-- Accuracy & Speed Card -->
	<g transform="translate(425, 200)">
		<rect x="6" y="6" width="330" height="170" rx="8" fill="#1c1917" />
		<rect x="0" y="0" width="330" height="170" rx="8" fill="#ffffff" stroke="#1c1917" stroke-width="4" />
		<text x="24" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="15" fill="#78716c" letter-spacing="1">ACCURACY &amp; SPEED</text>
		<text x="24" y="115" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="46" fill="#1c1917">${accuracyText}</text>
		<text x="24" y="148" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" fill="#78716c">in ${timeText}</text>
	</g>

	<!-- Logic Rank Card -->
	<g transform="translate(790, 200)">
		<rect x="6" y="6" width="330" height="170" rx="8" fill="#1c1917" />
		<rect x="0" y="0" width="330" height="170" rx="8" fill="#ffffff" stroke="#1c1917" stroke-width="4" />
		<text x="24" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="15" fill="#78716c" letter-spacing="1">LOGIC RANK</text>
		<text x="24" y="115" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#2563eb">${rankText}</text>
		<text x="24" y="148" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#16a34a">${share.correctAnswers}/${share.totalQuestions} Solved</text>
	</g>

	<!-- Questions Label -->
	<text x="60" y="415" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" fill="#78716c" letter-spacing="1">QUESTIONS BREAKDOWN</text>

	<!-- Tiles Grid -->
	${tilesSvg}

	<!-- Footer Callout Bar -->
	<g transform="translate(60, 520)">
		<rect width="1060" height="50" rx="6" fill="#1c1917" />
		<text x="530" y="32" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" fill="#fde047" text-anchor="middle" letter-spacing="1.5">
			CAN YOU BEAT THIS SCORE? • PLAY NOW AT ${host}
		</text>
	</g>
</svg>
	`.trim();
}

export function renderShareCardPng(share: PublicShareResultDto, appOrigin?: string): Buffer {
	const svg = renderShareCardSvg(share, appOrigin);
	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: 1200 }
	});
	return resvg.render().asPng();
}
