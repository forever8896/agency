<script lang="ts">
	import type { AgentStatus } from '$lib/types';
	import { STATUS_CONFIG } from '$lib/utils/agent-config';

	export let agent: AgentStatus;

	$: statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG['Idle'];
	$: isWorking = agent.status === 'Working';
	$: isBlocked = agent.status === 'Blocked';
    
    // Simple geometric avatar based on name length/char
    const getInitials = (name: string) => name.split('-').map(p => p[0]).join('').toUpperCase();
</script>

<div class="neo-box p-3 flex items-start gap-3 hover-lift bg-white mb-3">
    <!-- Avatar Box -->
	<div class="w-12 h-12 border-2 border-black flex items-center justify-center bg-black text-white font-mono font-bold text-lg shrink-0">
        {getInitials(agent.name)}
    </div>

	<div class="flex-1 min-w-0">
        <!-- Header Line -->
		<div class="flex items-center justify-between mb-1">
			<span class="font-bold text-lg leading-none">{agent.name}</span>
            <span 
                class="neo-tag text-[10px]"
                style="background-color: {statusConfig.color}; color: {agent.status === 'Idle' ? 'black' : 'white'};"
            >
                {agent.status.toUpperCase()}
            </span>
		</div>
        
        <!-- Status Details -->
		<div class="font-mono text-xs">
			{#if isBlocked}
				<div class="text-red-600 font-bold flex items-center gap-1 bg-red-100 p-1 border border-red-500 mt-1">
                    <span>!</span> BLOCKED: {agent.blockers}
				</div>
            {:else if agent.workingOn !== '--'}
                <div class="text-gray-600 mt-1 truncate p-1 bg-gray-50 border border-gray-200" title={agent.workingOn}>
                    <span class="font-bold text-black">></span> {agent.workingOn}
                </div>
			{:else}
				<div class="text-gray-400 italic mt-1 pl-1">
                   // System Idle
                </div>
			{/if}
		</div>
        
		{#if agent.updated && agent.updated !== '--'}
			<div class="mt-2 pt-2 border-t-2 border-gray-100 flex justify-end">
                <span class="text-[10px] font-mono text-gray-500 uppercase">
                    UPDATED: {agent.updated}
                </span>
			</div>
		{/if}
	</div>
</div>
