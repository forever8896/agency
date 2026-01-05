<script lang="ts">
	import type { AgentStatus } from '$lib/types';
	import { STATUS_CONFIG } from '$lib/utils/agent-config';
    import { getRandomFlavor } from '$lib/utils/flavor';

	export let agent: AgentStatus;

    // Generate flavor once per component instance
    const flavor = getRandomFlavor(agent.name);

	$: statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG['Idle'];
	$: isWorking = agent.status === 'Working';
	$: isBlocked = agent.status === 'Blocked';
    
    // Random activity animation delay to make them look less synchronized
    const animDelay = Math.random() * 2 + 's';
</script>

<div class="group flex items-start gap-4 p-3 rounded-xl border border-transparent hover:border-slate-600/50 hover:bg-slate-800/50 transition-all duration-300">
	<div class="relative flex-shrink-0">
		<div
			class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-slate-700/50 border border-slate-600 shadow-lg relative overflow-hidden"
            class:animate-float={isWorking}
            style="animation-delay: {animDelay}"
		>
            <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
			{flavor.avatar}
		</div>
		<div
			class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
			class:status-dot-working={isWorking}
			style="background-color: {statusConfig.color}"
		></div>
	</div>

	<div class="flex-1 min-w-0">
		<div class="flex flex-col">
            <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{flavor.name}</span>
                <span class="text-[10px] uppercase tracking-wider font-mono text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800">
                    {agent.name.replace('dev-', '')}
                </span>
            </div>
            <span class="text-xs text-blue-300/80 mb-1">{flavor.title}</span>
            
			{#if isBlocked}
				<div class="mt-1 flex items-center gap-2 text-xs bg-red-900/20 text-red-400 px-2 py-1 rounded border border-red-900/30 animate-pulse">
                    <span>🚫</span>
					<span class="font-medium truncate">{agent.blockers}</span>
				</div>
            {:else if agent.workingOn !== '--'}
                <div class="mt-1 text-xs text-slate-400 bg-slate-900/30 px-2 py-1 rounded border border-slate-800/50">
                    <span class="text-blue-500 mr-1">Running:</span>
                    <span class="font-mono text-slate-300 truncate">{agent.workingOn}</span>
                </div>
			{:else}
				<div class="mt-1 text-xs text-slate-600 italic">
                    Zzz... Idle
                </div>
			{/if}
		</div>
		{#if agent.updated && agent.updated !== '--'}
			<p class="text-[10px] text-slate-600 mt-1.5 text-right font-mono">
				Last act: {agent.updated}
			</p>
		{/if}
	</div>
</div>