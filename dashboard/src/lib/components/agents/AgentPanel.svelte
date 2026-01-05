<script lang="ts">
	import { agentsStore } from '$lib/stores/dashboard';
	import AgentAvatar from './AgentAvatar.svelte';
</script>

<aside class="w-80 flex-shrink-0 flex flex-col h-full overflow-hidden">
    <div class="bg-white border-2 border-black p-3 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 class="font-black text-xl uppercase flex justify-between items-center">
            OPERATIVES
            <span class="bg-black text-white px-2 py-0.5 text-sm font-mono">{$agentsStore.length}</span>
        </h3>
    </div>

    <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
        {#each $agentsStore as agent (agent.name)}
            <AgentAvatar {agent} />
        {:else}
            <div class="border-2 border-dashed border-gray-400 p-8 text-center text-gray-500 font-mono">
                NO_ACTIVE_AGENTS_FOUND
            </div>
        {/each}
    </div>
</aside>
