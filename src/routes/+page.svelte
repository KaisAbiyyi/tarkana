<script lang="ts">
	import PublicShell from '$lib/components/app/PublicShell.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import ChallengePreviewDemo from '$lib/components/app/landing/ChallengePreviewDemo.svelte';
	import CategoryCard from '$lib/components/app/landing/CategoryCard.svelte';
	import HowItWorksStep from '$lib/components/app/landing/HowItWorksStep.svelte';
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import { getI18nContext } from '$lib/i18n/context';

	const { t } = getI18nContext();
	const MOBILE_APK_URL =
		'https://github.com/KaisAbiyyi/tarkana-android/releases/download/android-v0.1.0-beta.1/tarkana-android-0.1.0-beta.1.apk';
	const WEB_GITHUB_URL = 'https://github.com/KaisAbiyyi/tarkana';
	const MOBILE_GITHUB_URL = 'https://github.com/KaisAbiyyi/tarkana-android';

	let pageRoot: HTMLDivElement;
	let howItWorksSection: HTMLElement;
	let categoriesSection: HTMLElement;
	let ctaSection: HTMLElement;

	onMount(() => {
		gsap.registerPlugin(ScrollTrigger);
		const media = gsap.matchMedia();
		const context = gsap.context(() => {
			media.add('(prefers-reduced-motion: no-preference)', () => {
				gsap.from('.hero-entrance', {
					y: 16,
					duration: 0.45,
					stagger: 0.06,
					ease: 'power2.out',
					clearProps: 'transform'
				});

				ScrollTrigger.create({
					trigger: howItWorksSection,
					start: 'top 82%',
					onEnter: (trigger) => {
						gsap.from('.hiw-entrance', {
							y: 18,
							opacity: 0,
							duration: 0.4,
							stagger: 0.08,
							ease: 'power2.out',
							clearProps: 'transform,opacity'
						});

						const connectorSelector = window.matchMedia('(min-width: 768px)').matches
							? '.hiw-desktop-connector'
							: '.hiw-mobile-connector';
						gsap.from(connectorSelector, {
							scaleX: window.matchMedia('(min-width: 768px)').matches ? 0 : 1,
							scaleY: window.matchMedia('(min-width: 768px)').matches ? 1 : 0,
							duration: 0.45,
							ease: 'power2.out',
							clearProps: 'transform'
						});
						trigger.kill();
					}
				});

				ScrollTrigger.create({
					trigger: categoriesSection,
					start: 'top 82%',
					onEnter: (trigger) => {
						gsap.from('.category-card', {
							y: 18,
							opacity: 0,
							duration: 0.4,
							stagger: 0.06,
							ease: 'power2.out',
							clearProps: 'transform,opacity'
						});
						trigger.kill();
					}
				});

				ScrollTrigger.create({
					trigger: ctaSection,
					start: 'top 88%',
					onEnter: (trigger) => {
						gsap.from('.cta-panel', {
							y: 20,
							opacity: 0,
							duration: 0.45,
							ease: 'power2.out',
							clearProps: 'transform,opacity'
						});
						trigger.kill();
					}
				});
			});
		}, pageRoot);

		let refreshFrame = 0;
		const handleResize = (): void => {
			cancelAnimationFrame(refreshFrame);
			refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(refreshFrame);
			media.revert();
			context.revert();
		};
	});
</script>

<svelte:head>
	<title>{t('landing.title')}</title>
	<meta name="description" content={t('landing.meta')} />
</svelte:head>

<PublicShell>
	<div bind:this={pageRoot} class="landing-page">
		<section class="landing-band landing-band-hero" aria-labelledby="landing-heading">
			<div class="page-shell hero-layout">
				<div class="hero-copy">
					<div class="hero-badge hero-entrance">
						<Badge tone="accent">{t('landing.badge')}</Badge>
					</div>
					<h1 id="landing-heading" class="hero-headline page-title hero-entrance">
						<span>{t('landing.heroOne')}</span>
						<span>{t('landing.heroTwo')}</span>
					</h1>
					<p class="hero-body hero-entrance">
						{t('landing.heroBody')}
					</p>

					<div class="hero-actions hero-entrance">
						<Button href="/auth/register" size="lg">{t('landing.freeCta')}</Button>
						<a class="secondary-cta" href="#cara-kerja">{t('landing.seeHow')}</a>
					</div>

					<p class="hero-microcopy hero-entrance">
						{t('landing.microcopy')}
					</p>
				</div>

				<div class="hero-preview hero-entrance">
					<ChallengePreviewDemo />
				</div>
			</div>
		</section>

		<section
			id="cara-kerja"
			bind:this={howItWorksSection}
			class="landing-band landing-band-how"
			aria-labelledby="how-it-works-heading"
		>
			<div class="page-shell section-layout">
				<header class="section-heading hiw-entrance">
					<h2 id="how-it-works-heading" class="section-title">{t('landing.howTitle')}</h2>
					<div class="section-underline" aria-hidden="true"></div>
				</header>

				<div class="steps-journey">
					<div class="hiw-desktop-connector" aria-hidden="true"></div>
					<div class="hiw-entrance">
						<HowItWorksStep
							stepNumber="1"
							title={t('landing.stepOne')}
							description={t('landing.stepOneBody')}
						/>
					</div>
					<div class="hiw-entrance">
						<HowItWorksStep
							stepNumber="2"
							title={t('landing.stepTwo')}
							description={t('landing.stepTwoBody')}
						/>
					</div>
					<div class="hiw-entrance">
						<HowItWorksStep
							stepNumber="3"
							title={t('landing.stepThree')}
							description={t('landing.stepThreeBody')}
							isLast={true}
						/>
					</div>
				</div>
			</div>
		</section>

		<section
			id="kategori"
			bind:this={categoriesSection}
			class="landing-band landing-band-categories"
			aria-labelledby="categories-heading"
		>
			<div class="page-shell section-layout">
				<header class="section-heading">
					<h2 id="categories-heading" class="section-title">{t('landing.categoriesTitle')}</h2>
					<div class="section-underline" aria-hidden="true"></div>
				</header>

				<div class="category-grid">
					<CategoryCard title={t('category.number')} description={t('category.numberBody')} />
					<CategoryCard title={t('category.symbol')} description={t('category.symbolBody')} />
					<CategoryCard title={t('category.deduction')} description={t('category.deductionBody')} />
					<CategoryCard title={t('category.memory')} description={t('category.memoryBody')} />
				</div>
			</div>
		</section>

		<section
			bind:this={ctaSection}
			class="landing-band landing-band-cta"
			aria-labelledby="closing-heading"
		>
			<div class="page-shell">
				<div class="cta-panel">
					<div class="cta-content">
						<p class="cta-eyebrow">{t('landing.ready')}</p>
						<h2 id="closing-heading" class="section-title">{t('landing.closing')}</h2>
						<p class="cta-body">
							{t('landing.closingBody')}
						</p>
						<Button href="/auth/register" size="lg" variant="secondary"
							>{t('landing.freeCta')}</Button
						>
						<p class="cta-microcopy">{t('landing.shortMicrocopy')}</p>
					</div>
				</div>
			</div>
		</section>

		<section class="landing-band landing-band-mobile" aria-labelledby="mobile-app-heading">
			<div class="page-shell">
				<div class="mobile-release-panel">
					<div class="mobile-release-copy">
						<p class="cta-eyebrow">Beta release</p>
						<h2 id="mobile-app-heading" class="section-title">Get the mobile app</h2>
						<p class="mobile-release-body">
							Install Tarkana Android beta and run ranked logic challenges from your phone. The APK
							is published through GitHub Releases so every build stays traceable.
						</p>
					</div>
					<div class="mobile-release-actions">
						<a class="release-button release-button--primary" href={MOBILE_APK_URL}>Download APK</a>
						<a class="release-button" href={MOBILE_GITHUB_URL}>Star mobile app</a>
						<a class="release-button" href={WEB_GITHUB_URL}>Star web app</a>
					</div>
				</div>
			</div>
		</section>
	</div>
</PublicShell>

<style>
	.landing-page {
		background: var(--color-paper);
	}

	.landing-band {
		position: relative;
		isolation: isolate;
	}

	.landing-band::before {
		position: absolute;
		inset: 0;
		z-index: -1;
		content: '';
		background-size: 32px 32px;
	}

	.landing-band-hero::before {
		background-image:
			linear-gradient(rgba(23, 18, 13, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(23, 18, 13, 0.05) 1px, transparent 1px),
			linear-gradient(180deg, #fffaf0 0%, var(--color-paper) 100%);
	}

	.landing-band-how::before {
		background-image:
			linear-gradient(rgba(23, 18, 13, 0.022) 1px, transparent 1px),
			linear-gradient(90deg, rgba(23, 18, 13, 0.022) 1px, transparent 1px);
	}

	.landing-band-categories::before,
	.landing-band-cta::before,
	.landing-band-mobile::before {
		background-image:
			linear-gradient(rgba(23, 18, 13, 0.014) 1px, transparent 1px),
			linear-gradient(90deg, rgba(23, 18, 13, 0.014) 1px, transparent 1px);
	}

	.hero-layout {
		display: grid;
		gap: var(--space-6);
		align-items: center;
		padding-block: var(--space-6) var(--space-8);
	}

	.hero-copy {
		min-width: 0;
	}

	.hero-badge {
		display: inline-block;
	}

	.hero-headline {
		display: flex;
		margin: var(--space-3) 0 0;
		flex-direction: column;
		gap: 0.125rem;
	}

	.hero-headline span:last-child {
		color: var(--color-primary-strong);
	}

	.hero-body {
		max-width: 620px;
		margin: var(--space-3) 0 0;
		font-size: 1.0625rem;
		line-height: 1.7;
		color: var(--color-muted);
		text-wrap: pretty;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.secondary-cta {
		display: inline-flex;
		min-height: 56px;
		align-items: center;
		justify-content: center;
		border: 3px solid var(--color-border);
		background: white;
		padding: 1rem 1.75rem;
		box-shadow: var(--shadow-level-1);
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.025em;
		text-align: center;
		text-transform: uppercase;
		text-decoration: none;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background-color 150ms ease;
	}

	.secondary-cta:hover {
		transform: translateY(-2px);
		background: var(--color-accent);
		box-shadow: 4px 5px 0 var(--color-border);
	}

	.secondary-cta:active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 var(--color-border);
	}

	.hero-microcopy {
		margin: var(--space-3) 0 0;
		font-size: 0.8125rem;
		line-height: 1.5;
		font-weight: 600;
		color: var(--color-muted);
	}

	.hero-preview {
		min-width: 0;
	}

	.section-layout {
		padding-block: var(--space-4) var(--space-6);
	}

	.landing-band-categories .section-layout {
		padding-block: var(--space-5) var(--space-6);
	}

	.section-heading {
		margin-bottom: var(--space-5);
	}

	.section-heading h2 {
		margin: 0;
	}

	.section-underline {
		width: 72px;
		height: 6px;
		margin-top: 0.875rem;
		background: var(--color-border);
	}

	.steps-journey {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-6);
	}

	.hiw-desktop-connector {
		position: absolute;
		top: 27px;
		right: calc(100% / 6);
		left: calc(100% / 6);
		z-index: 0;
		height: 3px;
		transform-origin: left;
		background: var(--color-border);
	}

	.steps-journey > :global(div:not(.hiw-desktop-connector)) {
		position: relative;
		z-index: 1;
		min-width: 0;
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		grid-auto-rows: 1fr;
		gap: var(--space-3);
		align-items: stretch;
	}

	.landing-band-cta {
		padding-block: var(--space-6) var(--space-10);
	}

	.landing-band-mobile {
		padding-block: 0 var(--space-10);
	}

	.cta-panel {
		max-width: 896px;
		margin-inline: auto;
		border: 4px solid var(--color-border);
		background: var(--color-primary);
		padding: var(--space-6);
		box-shadow: var(--shadow-level-3);
		text-align: center;
	}

	.cta-content {
		display: flex;
		align-items: center;
		flex-direction: column;
	}

	.cta-eyebrow {
		margin: 0 0 var(--space-2);
		border: 2px solid var(--color-border);
		background: white;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.cta-content h2 {
		max-width: 680px;
		margin: 0;
		font-size: clamp(2rem, 4.5vw, 2.75rem);
	}

	.cta-body {
		max-width: 640px;
		margin: var(--space-2) 0 var(--space-3);
		font-size: 1.0625rem;
		line-height: 1.65;
		font-weight: 500;
		text-wrap: pretty;
	}

	.cta-microcopy {
		margin: var(--space-2) 0 0;
		font-size: 0.8125rem;
		line-height: 1.5;
		font-weight: 600;
	}

	.mobile-release-panel {
		display: grid;
		max-width: 980px;
		margin-inline: auto;
		grid-template-columns: minmax(0, 1fr) minmax(260px, 0.45fr);
		gap: var(--space-4);
		align-items: center;
		border: 4px solid var(--color-border);
		background: var(--color-info);
		padding: var(--space-5);
		box-shadow: var(--shadow-level-3);
	}

	.mobile-release-copy h2 {
		margin: 0;
	}

	.mobile-release-body {
		max-width: 620px;
		margin: var(--space-2) 0 0;
		font-size: 1rem;
		line-height: 1.65;
		font-weight: 650;
		text-wrap: pretty;
	}

	.mobile-release-actions {
		display: grid;
		gap: 0.75rem;
	}

	.release-button {
		display: inline-flex;
		min-height: 52px;
		align-items: center;
		justify-content: center;
		border: 3px solid var(--color-border);
		background: white;
		padding: 0.85rem 1rem;
		box-shadow: var(--shadow-level-1);
		color: var(--color-ink);
		font-size: 0.95rem;
		font-weight: 900;
		text-align: center;
		text-decoration: none;
		text-transform: uppercase;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background-color 150ms ease;
	}

	.release-button--primary {
		background: var(--color-primary);
	}

	.release-button:hover {
		transform: translateY(-2px);
		background: var(--color-accent);
		box-shadow: 4px 5px 0 var(--color-border);
	}

	.release-button:active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 var(--color-border);
	}

	@media (min-width: 1120px) {
		.hero-layout {
			grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
			gap: var(--space-8);
		}
	}

	@media (max-width: 1119px) {
		.hero-copy,
		.hero-preview {
			width: 100%;
			max-width: 800px;
			margin-inline: auto;
		}
	}

	@media (max-width: 900px) {
		.category-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 767px) {
		.hero-layout {
			gap: var(--space-5);
			padding-block: var(--space-4) var(--space-5);
		}

		.section-layout,
		.landing-band-categories .section-layout {
			padding-block: var(--space-3) var(--space-4);
		}

		.section-heading {
			margin-bottom: var(--space-4);
		}

		.steps-journey {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}

		.hiw-desktop-connector {
			display: none;
		}

		.landing-band-cta {
			padding-block: var(--space-4) var(--space-8);
		}

		.landing-band-mobile {
			padding-block: 0 var(--space-8);
		}

		.cta-panel {
			padding: var(--space-4) var(--space-3);
		}

		.mobile-release-panel {
			grid-template-columns: 1fr;
			padding: var(--space-4) var(--space-3);
		}
	}

	@media (max-width: 560px) {
		.hero-headline {
			font-size: clamp(2.35rem, 12vw, 3.25rem);
		}

		.hero-body {
			font-size: 1rem;
		}

		.hero-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.hero-actions :global(.btn),
		.secondary-cta {
			width: 100%;
		}

		.category-grid {
			grid-template-columns: 1fr;
			gap: var(--space-2);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.secondary-cta,
		.release-button {
			transition: none;
		}

		.secondary-cta:hover,
		.secondary-cta:active,
		.release-button:hover,
		.release-button:active {
			transform: none;
		}
	}
</style>
