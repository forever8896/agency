<script lang="ts">
	import Board from '$lib/components/kanban/Board.svelte';
	import AgentPanel from '$lib/components/agents/AgentPanel.svelte';
	import HandoffFlow from '$lib/components/handoffs/HandoffFlow.svelte';
</script>

<svelte:head>
	<title>AGENCY_OPS</title>
</svelte:head>

<div class="flex gap-6 h-[calc(100vh-140px)]">
    <!-- Main Workflow -->
    <div class="flex-1 flex flex-col min-w-0">
        <Board />
    </div>

    <!-- Sidebar -->
    <div class="flex-shrink-0 flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-4">
        <AgentPanel />
        <HandoffFlow />
    </div>
</div>
