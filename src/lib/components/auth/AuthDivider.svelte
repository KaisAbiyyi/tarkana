<script lang="ts">
	import { getI18nContext } from '$lib/i18n/context';
	const { t } = getI18nContext();
</script>

<div class="relative my-6 text-center">
	<div class="absolute inset-0 flex items-center" aria-hidden="true">
		<div class="w-full border-t-[3px] border-[var(--color-border)]"></div>
	</div>
	<span
		class="relative bg-[var(--color-surface)] px-4 text-sm font-bold tracking-wider text-[var(--color-muted)] uppercase"
		>{t('common.or')}</span
	>
</div>
