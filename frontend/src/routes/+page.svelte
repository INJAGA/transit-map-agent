<script lang="ts">
	let count = $state(0);
</script>

<main class="mx-auto flex max-w-xl flex-col gap-6 p-8">
	<h1 class="flex items-center gap-2 text-3xl font-bold">
		<span class="icon-[tabler--brand-svelte] text-primary"></span>
		Welcome to SvelteKit
	</h1>

	<div role="alert" class="alert alert-info">
		<span class="icon-[tabler--info-circle] size-6"></span>
		<span>daisyUI と Iconify（Tabler Icons）のサンプルです。</span>
	</div>

	<div class="card bg-base-200 shadow">
		<div class="card-body">
			<h2 class="card-title">
				<span class="icon-[tabler--click]"></span>
				カウンター
			</h2>
			<p class="text-4xl font-bold tabular-nums">{count}</p>
			<div class="card-actions justify-end">
				<button class="btn btn-ghost" onclick={() => (count = 0)}>
					<span class="icon-[tabler--refresh]"></span>
					リセット
				</button>
				<button class="btn btn-primary" onclick={() => count++}>
					<span class="icon-[tabler--plus]"></span>
					増やす
				</button>
			</div>
		</div>
	</div>
</main>
