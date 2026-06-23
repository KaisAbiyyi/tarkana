<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/primitives/Button.svelte';
	import { onMount, tick } from 'svelte';
	import gsap from 'gsap';
	import LanguageSelector from '$lib/components/app/LanguageSelector.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		variant?: 'default' | 'auth';
		children?: Snippet;
	};

	let { variant = 'default', children }: Props = $props();
	const { t } = getI18nContext();

	let headerEl: HTMLElement;
	let menuButton: HTMLButtonElement;
	let menuPanel = $state<HTMLElement>();
	let menuOpen = $state(false);

	const homeHref = resolve('/');

	async function openMenu(): Promise<void> {
		menuOpen = true;
		await tick();

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!reducedMotion && menuPanel) {
			gsap.fromTo(
				menuPanel,
				{ y: -8, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.18, ease: 'power2.out', clearProps: 'transform,opacity' }
			);
		}

		menuPanel?.querySelector<HTMLElement>('a')?.focus();
	}

	function closeMenu(restoreFocus = false): void {
		if (menuPanel) gsap.killTweensOf(menuPanel);
		menuOpen = false;
		if (restoreFocus) menuButton?.focus();
	}

	function toggleMenu(): void {
		if (menuOpen) {
			closeMenu(true);
			return;
		}
		void openMenu();
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && menuOpen) closeMenu(true);
	}

	onMount(() => {
		const media = gsap.matchMedia();
		const context = gsap.context(() => {
			media.add('(prefers-reduced-motion: no-preference)', () => {
				gsap.from('.nav-entrance', {
					y: -10,
					duration: 0.35,
					stagger: 0.06,
					ease: 'power2.out',
					clearProps: 'transform'
				});
			});
		}, headerEl);

		const handleResize = (): void => {
			if (window.innerWidth >= 768 && menuOpen) closeMenu();
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			media.revert();
			context.revert();
		};
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="flex min-h-screen flex-col">
	<a class="skip-link" href="#main-content">{t('common.skipToContent')}</a>

	<header bind:this={headerEl} class="site-header">
		<div class="page-shell nav-row">
			<a class="nav-logo nav-entrance" href={homeHref} aria-label={t('nav.homeLabel')}>
				<span class="nav-logo-mark" aria-hidden="true">T</span>
				<span translate="no">TARKANA</span>
			</a>

			<nav class="desktop-nav" aria-label={t('nav.main')}>
				<a class="nav-link nav-entrance" href={resolve('/#cara-kerja')}>{t('nav.howItWorks')}</a>
				<a class="nav-link nav-entrance" href={resolve('/#kategori')}>{t('nav.categories')}</a>
				<a class="nav-link nav-entrance" href={resolve('/auth/login')}>{t('nav.login')}</a>
				<div class="nav-entrance"><LanguageSelector /></div>
				<div class="nav-entrance">
					<Button href="/auth/register" size="md">{t('nav.start')}</Button>
				</div>
			</nav>

			<button
				bind:this={menuButton}
				type="button"
				class="mobile-menu-button nav-entrance"
				aria-controls="mobile-navigation"
				aria-expanded={menuOpen}
				onclick={toggleMenu}
			>
				<span>{t('nav.menu')}</span>
				<span class="menu-icon" aria-hidden="true">{menuOpen ? '×' : '+'}</span>
			</button>
		</div>

		{#if menuOpen}
			<nav
				bind:this={menuPanel}
				id="mobile-navigation"
				class="page-shell mobile-nav"
				aria-label={t('nav.mobile')}
			>
				<a href={resolve('/#cara-kerja')} onclick={() => closeMenu()}>{t('nav.howItWorks')}</a>
				<a href={resolve('/#kategori')} onclick={() => closeMenu()}>{t('nav.categories')}</a>
				<a href={resolve('/auth/login')} onclick={() => closeMenu()}>{t('nav.login')}</a>
				<LanguageSelector />
				<Button href="/auth/register" size="md">{t('nav.start')}</Button>
			</nav>
		{/if}
	</header>

	<main id="main-content" class="flex-grow" tabindex="-1">
		{@render children?.()}
	</main>

	<footer class="site-footer {variant === 'auth' ? 'site-footer-auth' : ''}">
		<div class="page-shell footer-primary">
			<div class="footer-brand">
				<div class="footer-logo">
					<span class="footer-logo-mark" aria-hidden="true">T</span>
					<span translate="no">TARKANA</span>
				</div>
				<p>{t('footer.disclaimer')}</p>
			</div>
			<nav class="footer-nav" aria-label={t('nav.footer')}>
				<a href={resolve('/#cara-kerja')}>{t('nav.howItWorks')}</a>
				<a href={resolve('/#kategori')}>{t('nav.categories')}</a>
				<a href={resolve('/auth/login')}>{t('nav.login')}</a>
			</nav>
		</div>
		<div class="page-shell footer-bottom">
			<p>&copy; {new Date().getFullYear()} Tarkana. {t('footer.rights')}</p>
		</div>
	</footer>
</div>

<style>
	.site-header {
		position: relative;
		z-index: 20;
		background: var(--color-paper);
	}

	.nav-row {
		display: flex;
		min-height: 96px;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.nav-logo,
	.footer-logo {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 800;
		text-decoration: none;
	}

	.nav-logo {
		min-height: 44px;
	}

	.nav-logo-mark,
	.footer-logo-mark {
		display: grid;
		place-items: center;
		border: 3px solid var(--color-border);
		background: var(--color-primary);
		box-shadow: var(--shadow-level-1);
	}

	.nav-logo-mark {
		width: 40px;
		height: 40px;
	}

	.desktop-nav {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.nav-link,
	.footer-nav a,
	.mobile-nav a {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		padding-inline: 0.75rem;
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: 0.035em;
		text-transform: uppercase;
		text-decoration-thickness: 3px;
		text-underline-offset: 5px;
	}

	.nav-link:hover,
	.footer-nav a:hover,
	.mobile-nav a:hover {
		text-decoration-line: underline;
	}

	.mobile-menu-button {
		display: none;
		min-width: 96px;
		min-height: 44px;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1);
		border: 3px solid var(--color-border);
		background: var(--color-primary);
		padding: 0.5rem 0.75rem;
		box-shadow: var(--shadow-level-1);
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.menu-icon {
		font-size: 1.4rem;
		line-height: 1;
	}

	.mobile-nav {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-1);
		border: 3px solid var(--color-border);
		background: white;
		padding: var(--space-2);
		box-shadow: var(--shadow-level-2);
	}

	.mobile-nav a {
		justify-content: center;
		border: 2px solid transparent;
	}

	.mobile-nav a:hover,
	.mobile-nav a:focus-visible {
		border-color: var(--color-border);
		background: var(--color-paper);
		text-decoration: none;
	}

	.site-footer {
		border-top: 4px solid var(--color-border);
		background: white;
		padding-block: var(--space-5) var(--space-3);
	}

	.footer-primary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: var(--space-5);
	}

	.footer-brand {
		max-width: 640px;
	}

	.footer-logo {
		margin-bottom: var(--space-2);
	}

	.footer-logo-mark {
		width: 32px;
		height: 32px;
		font-size: 0.875rem;
	}

	.footer-brand p {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-muted);
		text-wrap: pretty;
	}

	.footer-nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-1);
	}

	.footer-bottom {
		margin-top: var(--space-4);
		border-top: 2px solid var(--color-border);
		padding-top: var(--space-2);
	}

	.footer-bottom p {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.site-footer-auth {
		padding-block: var(--space-3) var(--space-2);
	}

	.site-footer-auth .footer-primary {
		gap: var(--space-3);
	}

	.site-footer-auth .footer-logo {
		margin-bottom: var(--space-1);
	}

	.site-footer-auth .footer-brand p {
		font-size: 0.75rem;
	}

	.site-footer-auth .footer-bottom {
		margin-top: var(--space-3);
	}

	.skip-link {
		position: absolute;
		top: var(--space-2);
		left: var(--space-2);
		z-index: 100;
		transform: translateY(-200%);
		border: 3px solid var(--color-border);
		background: white;
		padding: 0.75rem 1rem;
		box-shadow: var(--shadow-level-1);
		font-weight: 700;
	}

	.skip-link:focus {
		transform: translateY(0);
	}

	@media (max-width: 899px) {
		.nav-row {
			min-height: 80px;
		}

		.desktop-nav {
			display: none;
		}

		.mobile-menu-button {
			display: inline-flex;
		}

		.footer-primary {
			grid-template-columns: 1fr;
			gap: var(--space-3);
		}

		.footer-nav {
			justify-content: flex-start;
		}
	}

	@media (max-width: 420px) {
		.nav-logo {
			gap: 0.5rem;
			font-size: 1.1rem;
		}

		.nav-logo-mark {
			width: 36px;
			height: 36px;
		}

		.mobile-menu-button {
			min-width: 88px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skip-link {
			transition: none;
		}
	}
</style>
