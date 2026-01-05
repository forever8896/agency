<script lang="ts">
	import Board from '$lib/components/kanban/Board.svelte';
	import AgentPanel from '$lib/components/agents/AgentPanel.svelte';
	import HandoffFlow from '$lib/components/handoffs/HandoffFlow.svelte';
</script>

<svelte:head>
	<title>AgencyOS Command Center</title>
</svelte:head>

<div class="flex gap-6 h-[calc(100vh-100px)] overflow-hidden">
    <!-- Main Kanban Board Area -->
    <div class="flex-1 flex flex-col min-w-0 glass-panel rounded-xl p-1 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/20 rounded-t-xl">
            <h2 class="text-sm font-bold text-blue-400 flex items-center gap-2 uppercase tracking-widest">
                <span class="text-lg animate-pulse">📋</span>
                Mission Control
            </h2>
            <div class="flex gap-2">
                <div class="h-2 w-2 rounded-full bg-red-500"></div>
                <div class="h-2 w-2 rounded-full bg-yellow-500"></div>
                <div class="h-2 w-2 rounded-full bg-green-500"></div>
            </div>
        </div>
        
        <div class="flex-1 overflow-hidden pt-4">
            <Board />
        </div>
    </div>

    <!-- Sidebar -->
    <div class="flex-shrink-0 w-96 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <AgentPanel />
        <HandoffFlow />
    </div>
</div>