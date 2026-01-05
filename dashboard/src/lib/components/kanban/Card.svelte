<script lang="ts">
	import type { Task } from '$lib/types';
	import { AGENT_CONFIG, PRIORITY_CONFIG } from '$lib/utils/agent-config';

	export let task: Task;

    // Direct agent config, no flavor
    $: agentConfig = AGENT_CONFIG[task.assignee] || { emoji: '', label: task.assignee, color: '#000' };
	$: priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG[2];
</script>

<div 
    class="bg-white border-2 border-black p-3 mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all cursor-pointer"
>
    <!-- Top Bar: Priority & ID -->
	<div class="flex justify-between items-start mb-2 border-b-2 border-gray-100 pb-2">
		<span
			class="font-mono text-xs font-bold px-2 py-0.5 border border-black uppercase"
			style="background-color: {priority.bgColor}; color: {priority.color}"
		>
			{priority.label}
		</span>
        <span class="font-mono text-xs text-gray-500">#{task.id || '---'}</span>
	</div>

    <!-- Title -->
	<h4 class="text-sm font-bold text-black mb-2 leading-tight">
		{task.title}
	</h4>

	{#if task.summary}
		<p class="text-xs font-mono text-gray-600 mb-3 leading-relaxed border-l-2 border-gray-300 pl-2">
			{task.summary}
		</p>
	{/if}

    <!-- Footer: Assignee & Files -->
    <div class="flex items-end justify-between mt-2">
        <!-- Files -->
        <div class="flex flex-wrap gap-1 max-w-[70%]">
            {#if task.files && task.files.length > 0}
                {#each task.files.slice(0, 2) as file}
                    <code class="text-[10px] bg-gray-100 text-black px-1 border border-black truncate max-w-full">
                        {file.split('/').pop()}
                    </code>
                {/each}
                {#if task.files.length > 2}
                    <span class="text-[10px] font-bold">+{task.files.length - 2}</span>
                {/if}
            {/if}
        </div>

        <!-- Assignee Badge -->
        <div class="flex items-center gap-1 bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {task.assignee.replace('dev-', '')}
        </div>
    </div>
</div>
