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

<div class="min-h-screen text-slate-200 scanlines">
	<!-- Header -->
	<header class="glass-panel sticky top-0 z-50 border-b-0 border-slate-700/50 px-6 py-4 mb-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-2xl animate-bounce">👾</span>
				<h1 class="text-xl font-bold text-white tracking-wide text-neon">AGENCY<span class="text-blue-400">OS</span></h1>
			</div>

			<div class="flex items-center gap-6">
				<!-- Connection status -->
				<div class="flex items-center gap-2 text-sm bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
					<div
						class="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"
						class:bg-green-500={$connectionStore}
						class:bg-red-500={!$connectionStore}
						class:status-dot-working={$connectionStore}
					></div>
					<span class="font-mono text-xs uppercase tracking-wider" class:text-green-400={$connectionStore} class:text-red-400={!$connectionStore}>
						{$connectionStore ? 'ONLINE' : 'OFFLINE'}
					</span>
				</div>

				<!-- Last update -->
				{#if $lastUpdateStore}
					<div class="flex flex-col items-end">
                        <span class="text-[10px] text-slate-400 uppercase tracking-widest">System Time</span>
						<span class="text-xs font-mono text-blue-300">
							{formatTime($lastUpdateStore)}
						</span>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="container mx-auto px-4 pb-12">
		<slot />
	</main>
</div>