<script lang="ts">
	import PublicShell from '$lib/components/app/PublicShell.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
</script>

<svelte:head>
	<title>Tarkana | Ranked Logic Challenge</title>
	<meta
		name="description"
		content="Tarkana adalah arena challenge logika berbasis waktu dengan Logic Rating, Reasoning Score, Rank Progress, dan Category Mastery."
	/>
</svelte:head>

<PublicShell>
	<section
		class="page-shell grid gap-10 py-10 md:py-14 lg:min-h-[calc(100dvh-88px)] lg:grid-cols-[0.92fr_1.08fr] lg:items-center"
	>
		<div class="space-y-7">
			<div class="space-y-4">
				<Badge tone="accent">Ranked logic challenge</Badge>
				<h1 class="page-title">Tarkana</h1>
				<p class="text-2xl font-black">Arena nalar untuk pikiran tajam.</p>
				<p class="max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
					Latih penalaran lewat challenge singkat berbasis waktu. Setiap jawaban, detik, dan streak
					membentuk Logic Rating, Reasoning Score, Rank Progress, dan Category Mastery.
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<Button href="/auth/register" size="lg">Mulai Challenge</Button>
				<Button href="/auth/login" size="lg" variant="ghost">Login</Button>
			</div>

			<p
				class="max-w-2xl border-l-[5px] border-[var(--color-border)] bg-white px-4 py-3 text-sm font-bold"
			>
				Tarkana bukan tes IQ resmi dan tidak memberi klaim klinis, medis, atau penilaian akademik
				formal.
			</p>
		</div>

		<div class="grid gap-4">
			<div class="ink-panel bg-white p-5 lg:p-6">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="page-kicker">Live challenge preview</p>
						<h2 class="text-3xl font-black">Question 4/10</h2>
					</div>
					<div
						class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] px-4 py-2 text-right shadow-[var(--shadow-hard-sm)]"
					>
						<p class="text-xs font-black uppercase">Timer</p>
						<p class="text-3xl font-black tabular-nums">18s</p>
					</div>
				</div>

				<div class="mt-6 border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-5">
					<Badge tone="accent">Number Sequence</Badge>
					<p class="mt-4 text-2xl font-black">Find the next number: 4, 8, 16, 32, ?</p>
					<div class="mt-5 grid gap-3 sm:grid-cols-2">
						<div class="choice-surface p-4 font-black">A. 48</div>
						<div class="choice-surface bg-[var(--color-primary)] p-4 font-black">B. 64</div>
						<div class="choice-surface p-4 font-black">C. 72</div>
						<div class="choice-surface p-4 font-black">D. 80</div>
					</div>
					<div class="mt-5 h-4 border-[3px] border-[var(--color-border)] bg-white">
						<div class="h-full w-[72%] bg-[var(--color-accent)]"></div>
					</div>
				</div>

				<div class="mt-4 grid gap-3 sm:grid-cols-3">
					<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-accent)] p-4">
						<p class="text-2xl font-black">+130</p>
						<p class="text-sm font-bold">Reasoning Score</p>
					</div>
					<div class="border-[3px] border-[var(--color-border)] bg-white p-4">
						<p class="text-2xl font-black">Server</p>
						<p class="text-sm font-bold">validasi skor</p>
					</div>
					<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-lime)] p-4">
						<p class="text-2xl font-black">Rank</p>
						<p class="text-sm font-bold">dari performa</p>
					</div>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-4">
				<div class="border-[3px] border-[var(--color-border)] bg-white p-4">
					<h2 class="font-black">Number Sequence</h2>
					<p class="text-sm font-semibold">Temukan pola angka berikutnya.</p>
				</div>
				<div class="border-[3px] border-[var(--color-border)] bg-white p-4">
					<h2 class="font-black">Symbol Pattern</h2>
					<p class="text-sm font-semibold">Baca rotasi dan pola simbol.</p>
				</div>
				<div class="border-[3px] border-[var(--color-border)] bg-white p-4">
					<h2 class="font-black">Mini Deduction</h2>
					<p class="text-sm font-semibold">Pecahkan clue pendek.</p>
				</div>
				<div class="border-[3px] border-[var(--color-border)] bg-white p-4">
					<h2 class="font-black">Memory Pattern</h2>
					<p class="text-sm font-semibold">Ingat pola, lalu jawab.</p>
				</div>
			</div>
		</div>
	</section>
</PublicShell>
