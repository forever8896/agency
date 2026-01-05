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
		if (!timestamp) return '--:--:--';
		return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
	}
</script>

<div class="min-h-screen flex flex-col">
	<!-- Header -->
	<header class="bg-white border-b-4 border-black px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div class="flex items-center gap-4">
            <div class="bg-black text-white px-3 py-1 font-black text-xl tracking-tighter transform -rotate-2">
                AGENCY
            </div>
            <h1 class="text-xl font-bold tracking-tight">OPERATIONS DASHBOARD</h1>
        </div>

        <div class="flex items-center gap-6 font-mono text-sm">
            <!-- Connection status -->
            <div class="flex items-center gap-3 border-2 border-black px-3 py-1 bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span class="font-bold uppercase">Status:</span>
                <span class="font-bold" class:text-green-600={$connectionStore} class:text-red-600={!$connectionStore}>
                    {$connectionStore ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
            </div>

            <!-- Last update -->
            {#if $lastUpdateStore}
                <div class="border-2 border-black px-3 py-1 bg-white">
                    <span class="text-gray-500 mr-2">LAST SYNC:</span>
                    <span class="font-bold">{formatTime($lastUpdateStore)}</span>
                </div>
            {/if}
        </div>
	</header>

	<!-- Main content -->
	<main class="flex-1 p-6 bg-[#f0f0f0]">
		<slot />
	</main>
</div>
