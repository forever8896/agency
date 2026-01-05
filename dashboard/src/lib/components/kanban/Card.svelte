<script lang="ts">
	import type { Task } from '$lib/types';
	import { AGENT_CONFIG, PRIORITY_CONFIG } from '$lib/utils/agent-config';

	export let task: Task;

	$: agent = AGENT_CONFIG[task.assignee] || { emoji: '👤', label: task.assignee, color: '#6b7280' };
	$: priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG[2];
</script>

<div class="task-card bg-white rounded-lg p-3 shadow-sm border-l-4" style="border-left-color: {priority.color}">
	<div class="flex justify-between items-start mb-2">
		<span
			class="text-xs font-semibold px-2 py-0.5 rounded"
			style="background-color: {priority.bgColor}; color: {priority.color}"
		>
			{priority.label}
		</span>
		<span class="text-xl" title="{agent.label}">
			{agent.emoji}
		</span>
	</div>

	<h4 class="text-sm font-semibold text-gray-800 mb-2 leading-tight">
		{task.title}
	</h4>

	{#if task.summary}
		<p class="text-xs text-gray-500 mb-2 line-clamp-2">
			{task.summary}
		</p>
	{/if}

	{#if task.files && task.files.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each task.files.slice(0, 3) as file}
				<code class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
					{file.split('/').pop()}
				</code>
			{/each}
			{#if task.files.length > 3}
				<span class="text-xs text-gray-400">+{task.files.length - 3}</span>
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
