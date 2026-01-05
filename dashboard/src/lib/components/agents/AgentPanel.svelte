<script lang="ts">
	import { agentsStore } from '$lib/stores/dashboard';
	import AgentAvatar from './AgentAvatar.svelte';
    import { getRandomEvent } from '$lib/utils/flavor';
    import { onMount, onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';

    let currentEvent = getRandomEvent();
    let interval: any;

    onMount(() => {
        interval = setInterval(() => {
            currentEvent = getRandomEvent();
        }, 8000);
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
    });
</script>

<aside class="w-96 flex-shrink-0 flex flex-col gap-6">
    <!-- Company News Ticker -->
    <div class="glass-panel rounded-xl p-4 relative overflow-hidden border-t-2 border-t-red-500/50">
        <div class="absolute inset-0 bg-red-900/5 pointer-events-none"></div>
        <h3 class="relative text-[10px] font-bold text-red-400 mb-3 uppercase tracking-widest flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
            AGENCY FEED
        </h3>
        <div class="relative font-mono text-xs text-green-400 h-8 flex items-center overflow-hidden">
             {#key currentEvent}
                <span in:fade={{ duration: 300 }} class="truncate w-full">
                    > {currentEvent}
                </span>
             {/key}
        </div>
    </div>

    <!-- Squad Status -->
    <div class="glass-panel rounded-xl p-5 flex-1 flex flex-col min-h-0">
        <h3 class="text-xs font-bold text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-slate-700/50 pb-3">
            <span class="text-lg">👥</span>
            Active Operatives
            <span class="ml-auto bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full text-[10px]">
                {$agentsStore.length}
            </span>
        </h3>

        <div class="space-y-3 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
            {#each $agentsStore as agent (agent.name)}
                <AgentAvatar {agent} />
            {:else}
                <div class="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                    <span class="text-4xl animate-pulse opacity-50">📡</span>
                    <p class="text-sm font-mono text-center">
                        Searching for active signals...<br>
                        <span class="text-xs opacity-50">Is the server running?</span>
                    </p>
                </div>
            {/each}
        </div>
    </div>
</aside>