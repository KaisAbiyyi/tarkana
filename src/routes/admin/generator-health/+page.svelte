<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import Card from '$lib/components/primitives/Card.svelte';
	import StatTile from '$lib/components/dashboard/StatTile.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();

	let selectedRule = $state('');
	let selectedDifficulty = $state<'easy' | 'medium' | 'hard'>('medium');
	let customSeed = $state('');

	$effect(() => {
		if (!selectedRule && data.samples.length > 0) {
			selectedRule = data.samples[0]!.ruleType;
		}
	});
</script>

<svelte:head>
	<title>Generator Health & Benchmarks | Tarkana Admin</title>
	<meta
		name="description"
		content="Tarkana procedural challenge generator health diagnostics and benchmark oracle status."
	/>
</svelte:head>

<section class="grid gap-8">
	<header>
		<p class="page-kicker">Admin Diagnostics</p>
		<h1 class="page-title">Generator Health & Invariant Oracles</h1>
		<p class="mt-3 max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
			Real-time health telemetry, invariant verification, and deterministic replay diagnostics for
			procedural challenge generators.
		</p>
	</header>

	<!-- KPI Overview Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<StatTile label="Dynamic Rules" value={data.ruleCount} tone="yellow" />
		<StatTile
			label="Healthy Generators"
			value={`${data.healthyCount}/${data.ruleCount}`}
			tone={data.allHealthy ? 'teal' : 'yellow'}
		/>
		<StatTile
			label="Generator Status"
			value={data.allHealthy ? 'Operational' : 'Attention Needed'}
			tone={data.allHealthy ? 'teal' : 'yellow'}
		/>
		<StatTile
			label="Runtime Engine"
			value={`${data.runtime.nodeVersion} (${data.runtime.platform})`}
		/>
	</div>

	<!-- Interactive Live Question Diagnostic Inspector -->
	<Card title="Live Generator Diagnostic Inspector">
		<p class="mb-4 text-sm font-bold text-[var(--color-muted)]">
			Run an isolated single-question diagnostic against any generator rule. Verifies structural
			schema, semantic mathematical/logical invariants, choice uniqueness, and deterministic
			reconstruction.
		</p>

		<form method="POST" action="?/diagnose" class="grid items-end gap-4 md:grid-cols-4">
			<div>
				<label for="ruleType" class="mb-1 block text-xs font-black uppercase">Rule Type</label>
				<select
					id="ruleType"
					name="ruleType"
					bind:value={selectedRule}
					class="w-full border-2 border-[var(--color-border)] bg-white p-2.5 text-sm font-bold"
				>
					{#each data.samples as sample (sample.ruleType)}
						<option value={sample.ruleType}>{sample.ruleType} ({sample.questionType})</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="difficulty" class="mb-1 block text-xs font-black uppercase">Difficulty</label>
				<select
					id="difficulty"
					name="difficulty"
					bind:value={selectedDifficulty}
					class="w-full border-2 border-[var(--color-border)] bg-white p-2.5 text-sm font-bold"
				>
					<option value="easy">Easy</option>
					<option value="medium">Medium</option>
					<option value="hard">Hard</option>
				</select>
			</div>

			<div>
				<label for="seed" class="mb-1 block text-xs font-black uppercase">Seed (Max 64 chars)</label
				>
				<input
					id="seed"
					name="seed"
					type="text"
					maxlength="64"
					placeholder="Optional seed token"
					bind:value={customSeed}
					class="w-full border-2 border-[var(--color-border)] bg-white p-2.5 font-mono text-sm"
				/>
			</div>

			<div>
				<Button type="submit" variant="primary" class="w-full">Run Live Diagnostic</Button>
			</div>
		</form>

		{#if form?.error}
			<div class="mt-6 border-2 border-red-600 bg-red-50 p-4 font-bold text-red-800">
				⚠️ {form.error}
			</div>
		{/if}

		{#if form?.diagnostic}
			<div class="mt-6 border-2 border-[var(--color-border)] bg-white p-6 shadow-sm">
				<div
					class="mb-4 flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--color-border)] pb-4"
				>
					<div>
						<span
							class="mr-2 border border-black bg-gray-200 px-2 py-0.5 font-mono text-xs font-black uppercase"
						>
							{form.diagnostic.ruleType}
						</span>
						<span
							class="mr-2 border border-black bg-yellow-200 px-2 py-0.5 font-mono text-xs font-black uppercase"
						>
							{form.diagnostic.difficulty}
						</span>
						<span class="font-mono text-xs text-gray-500">Seed: {form.diagnostic.seed}</span>
					</div>
					<div class="font-mono text-xs font-black text-gray-700">
						Latency: {form.diagnostic.latencyMs}ms
					</div>
				</div>

				<!-- Validation Checklist -->
				<div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="border-2 border-[var(--color-border)] bg-gray-50 p-3">
						<div class="text-xs font-black text-gray-600 uppercase">Structural Schema</div>
						<div class="mt-1 font-bold">
							{#if form.diagnostic.structural.valid}
								<span class="text-green-700">✓ Valid Schema</span>
							{:else}
								<span class="text-red-700">✗ {form.diagnostic.structural.errors.join(', ')}</span>
							{/if}
						</div>
					</div>

					<div class="border-2 border-[var(--color-border)] bg-gray-50 p-3">
						<div class="text-xs font-black text-gray-600 uppercase">Semantic Invariant</div>
						<div class="mt-1 font-bold">
							{#if form.diagnostic.semantic.valid}
								<span class="text-green-700">✓ Invariants Hold</span>
							{:else}
								<span class="text-red-700">✗ {form.diagnostic.semantic.reason}</span>
							{/if}
						</div>
					</div>

					<div class="border-2 border-[var(--color-border)] bg-gray-50 p-3">
						<div class="text-xs font-black text-gray-600 uppercase">Choices Uniqueness</div>
						<div class="mt-1 font-bold">
							{#if form.diagnostic.choices.unique && form.diagnostic.choices.unambiguous}
								<span class="text-green-700">✓ Unique & Unambiguous</span>
							{:else}
								<span class="text-red-700">✗ Choice Anomaly</span>
							{/if}
						</div>
					</div>

					<div class="border-2 border-[var(--color-border)] bg-gray-50 p-3">
						<div class="text-xs font-black text-gray-600 uppercase">Deterministic Replay</div>
						<div class="mt-1 font-bold">
							{#if form.diagnostic.replay.deterministic}
								<span class="text-green-700">✓ 100% Deterministic</span>
							{:else}
								<span class="text-red-700">✗ Replay Mismatch</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Question Payload Preview -->
				<div class="border-2 border-[var(--color-border)] bg-gray-50 p-4">
					<div class="mb-2 text-xs font-black text-gray-500 uppercase">Question Output Preview</div>
					<h3 class="mb-3 text-lg font-black">{form.diagnostic.question.prompt}</h3>

					<div class="mb-4 grid gap-2 sm:grid-cols-2">
						{#each form.diagnostic.question.choices as choice (choice)}
							<div
								class="border-2 p-3 font-mono text-sm font-bold {choice ===
								form.diagnostic.question.correctAnswer
									? 'border-green-600 bg-green-100 text-green-900'
									: 'border-gray-300 bg-white text-gray-800'}"
							>
								{choice}
								{#if choice === form.diagnostic.question.correctAnswer}
									<span
										class="ml-2 rounded bg-green-600 px-1.5 py-0.5 text-xs font-black text-white uppercase"
										>Correct</span
									>
								{/if}
							</div>
						{/each}
					</div>

					<div class="text-xs font-semibold text-gray-700">
						<span class="font-black">Explanation:</span>
						{form.diagnostic.question.explanation}
					</div>
				</div>
			</div>
		{/if}
	</Card>

	<!-- Generator Inventory Table -->
	<Card title="Procedural Generator Dynamic Inventory ({data.ruleCount} Rules)">
		<p class="mb-4 text-sm font-bold text-[var(--color-muted)]">
			Derived at runtime from active generator rule registries. Each rule was tested with a sample
			diagnostic run upon page load.
		</p>

		<div class="overflow-x-auto border-2 border-[var(--color-border)]">
			<table class="w-full min-w-[700px] border-collapse text-left">
				<thead class="bg-[var(--color-primary)]">
					<tr>
						<th class="border-b-[3px] border-[var(--color-border)] p-3 text-sm font-black"
							>Rule Type</th
						>
						<th class="border-b-[3px] border-[var(--color-border)] p-3 text-sm font-black"
							>Category</th
						>
						<th class="border-b-[3px] border-[var(--color-border)] p-3 text-sm font-black"
							>Status</th
						>
						<th class="border-b-[3px] border-[var(--color-border)] p-3 text-sm font-black"
							>Checks</th
						>
						<th class="border-b-[3px] border-[var(--color-border)] p-3 text-sm font-black"
							>Latency</th
						>
						<th class="border-b-[3px] border-[var(--color-border)] p-3 text-sm font-black"
							>Sample Output</th
						>
					</tr>
				</thead>
				<tbody>
					{#each data.samples as sample (sample.ruleType)}
						<tr
							class="border-b-2 border-[var(--color-border)] bg-white last:border-b-0 hover:bg-gray-50"
						>
							<td class="p-3 font-mono text-sm font-bold">{sample.ruleType}</td>
							<td class="p-3 text-sm font-bold">{sample.questionType}</td>
							<td class="p-3">
								<Badge tone={sample.isHealthy ? 'success' : 'danger'}>
									{sample.isHealthy ? 'Healthy' : 'Error'}
								</Badge>
							</td>
							<td class="p-3 font-mono text-xs">
								<span class={sample.structuralValid ? 'text-green-700' : 'text-red-700'}
									>Struct:{sample.structuralValid ? 'OK' : 'FAIL'}</span
								>
								|
								<span class={sample.semanticValid ? 'text-green-700' : 'text-red-700'}
									>Sem:{sample.semanticValid ? 'OK' : 'FAIL'}</span
								>
								|
								<span class={sample.replayValid ? 'text-green-700' : 'text-red-700'}
									>Replay:{sample.replayValid ? 'OK' : 'FAIL'}</span
								>
							</td>
							<td class="p-3 font-mono text-sm">{sample.latencyMs}ms</td>
							<td class="max-w-xs truncate p-3 text-xs text-gray-600" title={sample.samplePrompt}>
								{sample.samplePrompt}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
</section>
