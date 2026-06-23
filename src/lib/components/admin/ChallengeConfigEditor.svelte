<script lang="ts">
	import Button from '$lib/components/primitives/Button.svelte';
	import Input from '$lib/components/primitives/Input.svelte';
	import { getI18nContext } from '$lib/i18n/context';
	const { t } = getI18nContext();
</script>

<form
	class="grid gap-4 border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-5"
	method="POST"
	action="?/saveConfig"
>
	<h2 class="text-xl font-black">{t('admin.configEditor')}</h2>
	<Input
		id="name"
		name="name"
		label={t('admin.name')}
		placeholder={t('admin.standardChallengeName')}
		required
	/>
	<label class="grid gap-2 text-sm font-black uppercase">
		{t('admin.challengeType')}
		<select
			class="min-h-12 border-[3px] border-[var(--color-border)] bg-white px-4 font-bold shadow-[var(--shadow-hard-sm)]"
			name="challengeType"
			required
		>
			<option value="quick">{t('label.quick')}</option>
			<option value="standard">{t('label.standard')}</option>
			<option value="long">{t('label.long')}</option>
			<option value="daily">{t('label.daily')}</option>
			<option value="mixed">{t('label.mixed')}</option>
			<option value="mode">{t('label.practice')}</option>
			<option value="custom">{t('label.custom')}</option>
		</select>
	</label>
	<Input
		id="questionCount"
		name="questionCount"
		label={t('admin.questionCount')}
		type="number"
		value="10"
		min={1}
		max={100}
		required
	/>
	<label class="grid gap-2 text-sm font-black uppercase">
		{t('admin.modeDistribution')}
		<textarea
			class="min-h-24 border-[3px] border-[var(--color-border)] bg-white p-4 font-mono text-sm shadow-[var(--shadow-hard-sm)]"
			name="modeDistribution"
		></textarea>
	</label>
	<label class="grid gap-2 text-sm font-black uppercase">
		{t('admin.difficultyDistribution')}
		<textarea
			class="min-h-24 border-[3px] border-[var(--color-border)] bg-white p-4 font-mono text-sm shadow-[var(--shadow-hard-sm)]"
			name="difficultyDistribution"
		></textarea>
	</label>
	<label class="flex items-center gap-3 font-black">
		<input class="h-5 w-5" type="checkbox" name="isActive" checked />
		{t('admin.activeConfig')}
	</label>
	<Button type="submit">{t('admin.saveConfig')}</Button>
</form>
