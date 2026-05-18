<script lang="ts">
	import type { CategoryDto } from '$lib/shared/types/challenge';
	import Button from '$lib/components/primitives/Button.svelte';
	import Input from '$lib/components/primitives/Input.svelte';

	type Props = {
		categories: CategoryDto[];
		message?: string;
	};

	let { categories, message }: Props = $props();
</script>

<form
	class="grid gap-4 border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-5"
	method="POST"
	action="?/saveRule"
>
	<h2 class="text-xl font-black">Rule Editor</h2>
	{#if message}<p
			class="border-2 border-[var(--color-border)] bg-[var(--color-info)] p-3 font-bold"
		>
			{message}
		</p>{/if}
	<label class="grid gap-2 text-sm font-black uppercase">
		Category
		<select
			class="min-h-12 border-[3px] border-[var(--color-border)] bg-white px-4 font-bold shadow-[var(--shadow-hard-sm)]"
			name="categoryId"
			required
		>
			<option value="">Select category</option>
			{#each categories as category (category.id)}
				<option value={category.id}>{category.name}</option>
			{/each}
		</select>
	</label>
	<Input
		id="ruleType"
		name="ruleType"
		label="Rule type"
		placeholder="arithmetic_sequence"
		required
	/>
	<div class="grid gap-4 sm:grid-cols-3">
		<Input
			id="difficultyMin"
			name="difficultyMin"
			label="Difficulty min"
			type="number"
			value="100"
			min={1}
			required
		/>
		<Input
			id="difficultyMax"
			name="difficultyMax"
			label="Difficulty max"
			type="number"
			value="300"
			min={1}
			required
		/>
		<Input
			id="timeLimitSeconds"
			name="timeLimitSeconds"
			label="Time limit"
			type="number"
			value="30"
			min={1}
			required
		/>
	</div>
	<label class="grid gap-2 text-sm font-black uppercase">
		Config JSON
		<textarea
			class="min-h-28 border-[3px] border-[var(--color-border)] bg-white p-4 font-mono text-sm shadow-[var(--shadow-hard-sm)]"
			name="config">{'{}'}</textarea
		>
	</label>
	<label class="flex items-center gap-3 font-black">
		<input class="h-5 w-5" type="checkbox" name="isActive" checked />
		Active rule
	</label>
	<Button type="submit">Save Rule</Button>
</form>
