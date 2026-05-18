<script lang="ts">
	import Button from '$lib/components/primitives/Button.svelte';
	import Input from '$lib/components/primitives/Input.svelte';
</script>

<form
	class="grid gap-4 border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-5"
	method="POST"
	action="?/saveConfig"
>
	<h2 class="text-xl font-black">Challenge Config Editor</h2>
	<Input id="name" name="name" label="Name" placeholder="Standard Challenge" required />
	<label class="grid gap-2 text-sm font-black uppercase">
		Challenge type
		<select
			class="min-h-12 border-[3px] border-[var(--color-border)] bg-white px-4 font-bold shadow-[var(--shadow-hard-sm)]"
			name="challengeType"
			required
		>
			<option value="quick">Quick</option>
			<option value="standard">Standard</option>
			<option value="long">Long</option>
			<option value="daily">Daily</option>
			<option value="mixed">Mixed</option>
			<option value="mode">Mode</option>
			<option value="custom">Custom</option>
		</select>
	</label>
	<Input
		id="questionCount"
		name="questionCount"
		label="Question count"
		type="number"
		value="10"
		min={1}
		max={100}
		required
	/>
	<label class="grid gap-2 text-sm font-black uppercase">
		Mode distribution JSON
		<textarea
			class="min-h-24 border-[3px] border-[var(--color-border)] bg-white p-4 font-mono text-sm shadow-[var(--shadow-hard-sm)]"
			name="modeDistribution"
		></textarea>
	</label>
	<label class="grid gap-2 text-sm font-black uppercase">
		Difficulty distribution JSON
		<textarea
			class="min-h-24 border-[3px] border-[var(--color-border)] bg-white p-4 font-mono text-sm shadow-[var(--shadow-hard-sm)]"
			name="difficultyDistribution"
		></textarea>
	</label>
	<label class="flex items-center gap-3 font-black">
		<input class="h-5 w-5" type="checkbox" name="isActive" checked />
		Active config
	</label>
	<Button type="submit">Save Config</Button>
</form>
