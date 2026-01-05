<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { dashboardStore, connectionStore, lastUpdateStore } from '$lib/stores/dashboard';

	onMount(() => {
		dashboardStore.connect();
	});

	onDestroy(() => {
		dashboardStore.disconnect();
	});

	function formatTime(timestamp: number): string {
		if (!timestamp) return '--';
		return new Date(timestamp).toLocaleTimeString();
	}
</script>

<div class="min-h-screen bg-slate-50">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🏢</span>
				<h1 class="text-xl font-bold text-gray-800">Agency Dashboard</h1>
			</div>

			<div class="flex items-center gap-4">
				<!-- Connection status -->
				<div class="flex items-center gap-2 text-sm">
					<div
						class="w-2 h-2 rounded-full"
						class:bg-green-500={$connectionStore}
						class:bg-red-500={!$connectionStore}
						class:status-dot-working={$connectionStore}
					></div>
					<span class="text-gray-500">
						{$connectionStore ? 'Connected' : 'Disconnected'}
					</span>
				</div>

				<!-- Last update -->
				{#if $lastUpdateStore}
					<span class="text-xs text-gray-400">
						Updated: {formatTime($lastUpdateStore)}
					</span>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main>
		<slot />
	</main>
</div>
