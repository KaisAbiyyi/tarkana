<script lang="ts">
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	const { t } = getI18nContext();

	const modes = [
		{
			id: 'number_sequence',
			name: t('category.number'),
			desc: t('category.numberShort')
		},
		{
			id: 'symbol_pattern',
			name: t('category.symbol'),
			desc: t('category.symbolBody')
		},
		{
			id: 'mini_deduction',
			name: t('category.deduction'),
			desc: t('category.deductionShort')
		},
		{
			id: 'memory_pattern',
			name: t('category.memory'),
			desc: t('category.memoryShort')
		}
	];

	let selectedMode = $state(modes[0].id);
	let selectedModeName = $derived(modes.find((m) => m.id === selectedMode)?.name ?? modes[0].name);
</script>

<section class="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr] lg:grid-rows-[auto_1fr] lg:gap-8">
	<!-- 1. Intro -->
	<div
		class="ink-panel flex flex-col justify-center bg-white p-6 md:p-8 lg:col-start-1 lg:row-start-1"
	>
		<div class="space-y-3">
			<p class="text-xs font-black tracking-wider text-[var(--color-muted)] uppercase">
				{t('nav.dashboard')}
			</p>
			<h1 class="text-3xl leading-tight font-black md:text-4xl">{t('dashboard.firstRating')}</h1>
			<p
				class="max-w-2xl text-base leading-relaxed font-medium text-[var(--color-muted)] md:text-lg"
			>
				{t('dashboard.firstIntro')}
			</p>
			<div class="mt-2 inline-flex">
				<span
					class="rounded-full border-2 border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1 text-xs font-bold text-black"
				>
					{t('label.unranked')}
				</span>
			</div>
		</div>
	</div>

	<!-- 2. Mode Selection -->
	<div class="lg:col-start-1 lg:row-start-2">
		<Card title={t('dashboard.chooseMode')} description={t('dashboard.chooseModeBody')}>
			<div
				class="grid gap-3 sm:grid-cols-2"
				role="radiogroup"
				aria-label={t('dashboard.modeChoices')}
			>
				{#each modes as mode (mode.id)}
					<button
						type="button"
						role="radio"
						aria-checked={selectedMode === mode.id}
						tabindex={selectedMode === mode.id ? 0 : -1}
						class="group relative flex flex-col items-start border-2 border-[var(--color-border)] p-4 text-left transition-colors focus-visible:outline focus-visible:outline-4 focus-visible:outline-[var(--color-primary)] {selectedMode ===
						mode.id
							? 'bg-[var(--color-primary)]'
							: 'bg-white hover:bg-[var(--color-paper)]'}"
						onclick={() => (selectedMode = mode.id)}
					>
						<div class="flex w-full items-start justify-between gap-2">
							<span class="text-lg leading-tight font-black">{mode.name}</span>
							<div
								class="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-black bg-white transition-colors {selectedMode ===
								mode.id
									? 'bg-black'
									: ''}"
								aria-hidden="true"
							>
								{#if selectedMode === mode.id}
									<div class="h-2 w-2 rounded-full bg-[var(--color-primary)]"></div>
								{/if}
							</div>
						</div>
						<span
							class="mt-2 text-sm font-medium text-[var(--color-muted)] transition-colors group-hover:text-black"
						>
							{mode.desc}
						</span>
					</button>
				{/each}
			</div>
		</Card>
	</div>

	<!-- 3. CTA -->
	<div
		class="flex h-full flex-col justify-center border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-6 shadow-[var(--shadow-hard-md)] lg:col-start-2 lg:row-start-1"
	>
		<p class="text-xs font-black tracking-wide uppercase">{t('dashboard.startNow')}</p>
		<p class="mt-1 text-2xl leading-tight font-black md:text-3xl">
			{t('dashboard.firstChallenge')}
		</p>

		<div class="mt-4 mb-2 border-l-[3px] border-black pl-3">
			<p class="text-sm font-bold">{t('dashboard.selectedMode', { mode: selectedModeName })}</p>
			<p class="mt-0.5 text-xs font-semibold opacity-80">
				{t('dashboard.firstMeta')}
			</p>
		</div>

		<Button href={`/challenge?mode=${selectedMode}`} variant="ink" size="md" class="mt-6 w-full">
			{t('dashboard.startMode', { mode: selectedModeName })}
		</Button>
	</div>

	<!-- 4. Feature Preview -->
	<div class="lg:col-start-2 lg:row-start-2">
		<Card title={t('dashboard.unlockAfter')} description={t('dashboard.dataPreview')}>
			<ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
				<li class="flex items-start gap-3">
					<div
						class="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-accent)]"
						aria-hidden="true"
					>
						<svg
							class="h-5 w-5 text-black"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
							/>
						</svg>
					</div>
					<div>
						<p class="text-base font-black">{t('common.logicRating')}</p>
						<p class="text-sm leading-snug font-medium text-[var(--color-muted)]">
							{t('dashboard.ratingPreview')}
						</p>
					</div>
				</li>
				<li class="flex items-start gap-3">
					<div
						class="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-lime)]"
						aria-hidden="true"
					>
						<svg
							class="h-5 w-5 text-black"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-base font-black">{t('dashboard.accuracyTime')}</p>
						<p class="text-sm leading-snug font-medium text-[var(--color-muted)]">
							{t('dashboard.accuracyPreview')}
						</p>
					</div>
				</li>
				<li class="flex items-start gap-3">
					<div
						class="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-blue)]"
						aria-hidden="true"
					>
						<svg
							class="h-5 w-5 text-black"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-base font-black">{t('dashboard.categoryProgress')}</p>
						<p class="text-sm leading-snug font-medium text-[var(--color-muted)]">
							{t('dashboard.categoryPreview')}
						</p>
					</div>
				</li>
				<li class="flex items-start gap-3">
					<div
						class="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-paper)]"
						aria-hidden="true"
					>
						<svg
							class="h-5 w-5 text-black"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-base font-black">{t('dashboard.sessionHistory')}</p>
						<p class="text-sm leading-snug font-medium text-[var(--color-muted)]">
							{t('dashboard.historyPreview')}
						</p>
					</div>
				</li>
			</ul>
		</Card>
	</div>
</section>
