<script lang="ts">
	import type { AgentStatus } from '$lib/types';
	import { AGENT_CONFIG, STATUS_CONFIG } from '$lib/utils/agent-config';

	export let agent: AgentStatus;

	$: config = AGENT_CONFIG[agent.name] || { emoji: '👤', label: agent.name, color: '#6b7280', short: '?' };
	$: statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG['Idle'];
	$: isWorking = agent.status === 'Working';
	$: isBlocked = agent.status === 'Blocked';
</script>

<div class="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
	<div class="relative flex-shrink-0">
		<div
			class="w-10 h-10 rounded-full flex items-center justify-center text-xl"
			style="background-color: {config.color}20"
		>
			{config.emoji}
		</div>
		<div
			class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
			class:status-dot-working={isWorking}
			style="background-color: {statusConfig.color}"
		></div>
	</div>

	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold text-gray-800">{config.label}</span>
			{#if isBlocked}
				<span class="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
					BLOCKED
				</span>
			{/if}
		</div>
		<p class="text-xs text-gray-500 truncate" class:text-red-500={isBlocked}>
			{#if isBlocked}
				{agent.blockers}
			{:else if agent.workingOn !== '--'}
				{agent.workingOn}
			{:else}
				Idle
			{/if}
		</p>
		{#if agent.updated && agent.updated !== '--'}
			<p class="text-xs text-gray-400 mt-0.5">
				{agent.updated}
			</p>
		{/if}
	</div>
</div>
