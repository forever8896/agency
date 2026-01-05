<script lang="ts">
	import Board from '$lib/components/kanban/Board.svelte';
	import AgentPanel from '$lib/components/agents/AgentPanel.svelte';
	import HandoffFlow from '$lib/components/handoffs/HandoffFlow.svelte';
</script>

<svelte:head>
	<title>Agency Dashboard</title>
</svelte:head>

<div class="p-6">
	<div class="flex gap-6">
		<!-- Main Kanban Board -->
		<div class="flex-1 min-w-0">
			<h2 class="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
				<span>📋</span>
				Workflow
			</h2>
			<Board />
		</div>

		<!-- Sidebar -->
		<div class="flex-shrink-0 space-y-6">
			<AgentPanel />
			<HandoffFlow />
		</div>
	</div>
</div>
