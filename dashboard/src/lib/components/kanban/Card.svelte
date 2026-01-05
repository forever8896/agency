<script lang="ts">
	import type { Task } from '$lib/types';
	import { AGENT_CONFIG, PRIORITY_CONFIG } from '$lib/utils/agent-config';
    import { getRandomFlavor } from '$lib/utils/flavor';

	export let task: Task;

    // Generate a random flavor for the assignee on this specific card
    // This creates a "team" feel where 'dev-alpha' might be represented by 'Neo' on one card and 'Trinity' on another.
    const flavor = getRandomFlavor(task.assignee);

	$: priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG[2];
    
    // Determine border color based on priority
    $: borderColor = priority.color;
</script>

<div 
    class="glass-card rounded-lg p-3 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
    style="border-left: 3px solid {borderColor}"
>
    <!-- Background glow on hover -->
    <div class="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

	<div class="flex justify-between items-start mb-2">
		<span
			class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wider"
			style="background-color: {priority.bgColor}40; color: {priority.color}"
		>
			{priority.label}
		</span>
        <div class="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <span class="text-[10px] text-slate-400 font-mono">{flavor.name}</span>
            <span class="text-lg filter drop-shadow-lg" title="{task.assignee}">
                {flavor.avatar}
            </span>
        </div>
	</div>

	<h4 class="text-sm font-bold text-slate-200 mb-2 leading-snug drop-shadow-sm group-hover:text-blue-300 transition-colors">
		{task.title}
	</h4>

	{#if task.summary}
		<p class="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
			{task.summary}
		</p>
	{/if}

	{#if task.files && task.files.length > 0}
		<div class="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
			{#each task.files.slice(0, 3) as file}
				<code class="text-[10px] bg-slate-900/50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50 font-mono">
					{file.split('/').pop()}
				</code>
			{/each}
			{#if task.files.length > 3}
				<span class="text-[10px] text-slate-500 flex items-center">+{task.files.length - 3}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>