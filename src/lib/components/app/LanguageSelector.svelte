<script lang="ts">
	import { page } from '$app/state';
	import { getI18nContext } from '$lib/i18n/context';
	import { LOCALE_OPTIONS } from '$lib/i18n';

	const { locale, t } = getI18nContext();
</script>

<form method="POST" action="/locale" class="language-selector">
	<label>
		<span class="sr-only">{t('language.change')}</span>
		<select
			name="locale"
			value={locale}
			aria-label={t('language.select')}
			onchange={(event) => event.currentTarget.form?.submit()}
		>
			{#each LOCALE_OPTIONS as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</label>
	<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
</form>

<style>
	.language-selector select {
		min-height: 44px;
		max-width: 12rem;
		border: 2px solid var(--color-border);
		background: white;
		padding: 0.5rem 2rem 0.5rem 0.625rem;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 800;
		box-shadow: var(--shadow-hard-sm);
	}

	:global([dir='rtl']) .language-selector select {
		padding-right: 0.625rem;
		padding-left: 2rem;
	}
</style>
