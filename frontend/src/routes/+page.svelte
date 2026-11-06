<script lang="ts">
	import { HttpAgent, type Message } from '@ag-ui/client';
	import { run } from '#lib/agent/run.svelte.js';
	import { frontendTools } from '#lib/agent/tools/index.js';
	import { uiState } from '#lib/agent/ui-state.svelte.js';
	import MapView from '#lib/components/MapView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const agent = new HttpAgent({ url: '/api/agent' });
	let messages = $state.raw<Message[]>([]);
	let prompt = $state('');
	let running = $state(false);
	let error = $state('');

	async function send(event: SubmitEvent) {
		event.preventDefault();
		if (!prompt.trim() || running) return;
		agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: prompt });
		prompt = '';
		running = true;
		error = '';
		try {
			await run(agent, frontendTools, (m) => (messages = m));
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			messages = [...agent.messages];
			running = false;
		}
	}
</script>

<svelte:head>
	<title>{uiState.pageTitle}</title>
</svelte:head>

<MapView />

<main
	class="absolute top-4 left-4 flex max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto"
>
	<h1 class="flex items-center gap-2 rounded-box bg-base-100/90 p-4 text-2xl font-bold shadow">
		<span class="icon-[tabler--brand-svelte] text-primary"></span>
		{uiState.pageTitle}
	</h1>

	<div
		role="status"
		class="alert"
		class:alert-success={data.health !== null}
		class:alert-warning={data.health === null}
	>
		<span class="icon-[tabler--heartbeat] size-6"></span>
		<span
			>{data.health
				? `API の状態: ${data.health.status}`
				: 'API に接続できません。カウンターは引き続き利用できます。'}</span
		>
	</div>

	<div class="card bg-base-200 shadow">
		<div class="card-body">
			<h2 class="card-title">
				<span class="icon-[tabler--click]"></span>
				カウンター
			</h2>
			<p class="text-4xl font-bold tabular-nums">{uiState.count}</p>
			<div class="card-actions justify-end">
				<button class="btn btn-ghost" onclick={() => (uiState.count = 0)}>
					<span class="icon-[tabler--refresh]"></span>
					リセット
				</button>
				<button class="btn btn-primary" onclick={() => uiState.count++}>
					<span class="icon-[tabler--plus]"></span>
					増やす
				</button>
			</div>
		</div>
	</div>

	<div class="card bg-base-200 shadow">
		<div class="card-body">
			<h2 class="card-title">
				<span class="icon-[tabler--robot]"></span>
				アシスタント
			</h2>
			{#each messages as message (message.id)}
				{#if message.role === 'user' || message.role === 'assistant'}
					<div class="chat" class:chat-end={message.role === 'user'}>
						{#if typeof message.content === 'string' && message.content}
							<div class="chat-bubble" class:chat-bubble-primary={message.role === 'user'}>
								{message.content}
							</div>
						{/if}
						{#if message.role === 'assistant'}
							{#each message.toolCalls ?? [] as call (call.id)}
								<div class="chat-footer badge gap-1 badge-ghost">
									<span class="icon-[tabler--tool]"></span>
									{call.function.name}
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			{/each}
			{#if error}
				<div role="alert" class="alert alert-error">
					<span class="icon-[tabler--alert-triangle] size-6"></span>
					<span>{error}</span>
				</div>
			{/if}
			<form class="join w-full" onsubmit={send}>
				<input
					class="input join-item w-full"
					placeholder="例: 名古屋城を表示して"
					aria-label="アシスタントへの質問"
					bind:value={prompt}
					disabled={running}
				/>
				<button class="btn join-item btn-primary" disabled={running} aria-label="送信">
					{#if running}
						<span class="loading loading-spinner"></span>
					{:else}
						<span class="icon-[tabler--send]"></span>
					{/if}
				</button>
			</form>
		</div>
	</div>
</main>
