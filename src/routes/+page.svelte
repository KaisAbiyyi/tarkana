<script lang="ts">
	import PublicShell from '$lib/components/app/PublicShell.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
</script>

<PublicShell>
	<section
		class="page-shell grid min-h-[calc(100vh-88px)] items-center gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr]"
	>
		<div class="space-y-7">
			<div class="space-y-4">
				<Badge tone="accent">Ranked logic challenge</Badge>
				<h1 class="max-w-3xl text-6xl leading-[0.95] font-black sm:text-7xl lg:text-8xl">
					Tarkana
				</h1>
				<p class="text-2xl font-black">Arena nalar untuk pikiran tajam.</p>
				<p class="max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
					Latih penalaran lewat challenge singkat berbasis waktu. Logic Rating, Reasoning Score,
					Rank Progress, dan Category Mastery dihitung dari performa aktual.
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

		<div class="grid gap-5">
			<Card tone="warning" title="Challenge Modes" description="Empat mode awal untuk MVP web.">
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="border-2 border-[var(--color-border)] bg-white p-4">
						<h2 class="font-black">Number Sequence</h2>
						<p class="text-sm font-semibold">Temukan pola angka berikutnya.</p>
					</div>
					<div class="border-2 border-[var(--color-border)] bg-white p-4">
						<h2 class="font-black">Symbol Pattern</h2>
						<p class="text-sm font-semibold">Baca rotasi, urutan, dan pola simbol.</p>
					</div>
					<div class="border-2 border-[var(--color-border)] bg-white p-4">
						<h2 class="font-black">Mini Deduction</h2>
						<p class="text-sm font-semibold">Pecahkan clue pendek secara logis.</p>
					</div>
					<div class="border-2 border-[var(--color-border)] bg-white p-4">
						<h2 class="font-black">Memory Pattern</h2>
						<p class="text-sm font-semibold">Ingat pola singkat, lalu jawab.</p>
					</div>
				</div>
			</Card>

			<div class="grid gap-3 sm:grid-cols-3">
				<div
					class="border-[3px] border-[var(--color-border)] bg-[var(--color-accent)] p-4 shadow-[var(--shadow-hard-sm)]"
				>
					<p class="text-2xl font-black">Server</p>
					<p class="text-sm font-bold">validasi skor</p>
				</div>
				<div
					class="border-[3px] border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-hard-sm)]"
				>
					<p class="text-2xl font-black">No email</p>
					<p class="text-sm font-bold">di leaderboard</p>
				</div>
				<div
					class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-4 shadow-[var(--shadow-hard-sm)]"
				>
					<p class="text-2xl font-black">Rank</p>
					<p class="text-sm font-bold">dari performa</p>
				</div>
			</div>
		</div>
	</section>
</PublicShell>
