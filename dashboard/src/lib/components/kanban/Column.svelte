<script lang="ts">
	import type { Task, TaskStatus } from '$lib/types';
	import { COLUMN_CONFIG } from '$lib/utils/agent-config';
	import Card from './Card.svelte';

	export let status: TaskStatus;
	export let tasks: Task[] = [];

	$: config = COLUMN_CONFIG[status] || { color: '#6b7280', bgColor: '#f3f4f6', icon: '📋' };
	$: displayName = status.replace(/_/g, ' ');
</script>

<div class="flex flex-col w-72 min-w-72 flex-shrink-0">
	<div
		class="flex items-center gap-2 px-3 py-2 rounded-t-lg"
		style="background-color: {config.bgColor}"
	>
		<span class="text-lg">{config.icon}</span>
		<h3 class="text-sm font-semibold" style="color: {config.color}">
			{displayName}
		</h3>
		<span
			class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
			style="background-color: {config.color}; color: white"
		>
			{tasks.length}
		</span>
	</div>

	<div class="flex-1 bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto">
		{#each tasks as task (task.id)}
			<Card {task} />
		{:else}
			<div class="text-center text-gray-400 text-sm py-8">
				No items
			</div>
		{/each}
	</div>
</div>
