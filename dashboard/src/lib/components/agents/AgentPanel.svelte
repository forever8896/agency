<script lang="ts">
	import { agentsStore } from '$lib/stores/dashboard';
	import AgentAvatar from './AgentAvatar.svelte';
</script>

<aside class="bg-white rounded-xl shadow-sm p-4 w-72">
	<h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
		<span>👥</span>
		Squad Status
	</h3>

	<div class="space-y-1">
		{#each $agentsStore as agent (agent.name)}
			<AgentAvatar {agent} />
		{:else}
			<p class="text-sm text-gray-400 text-center py-4">
				No agent data
			</p>
		{/each}
	</div>
</aside>
