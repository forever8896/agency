<script lang="ts">
	import { backlogStore } from '$lib/stores/dashboard';
	import type { TaskStatus } from '$lib/types';
	import Column from './Column.svelte';

	// Main workflow columns to display
	const columnOrder: TaskStatus[] = [
		'READY',
		'IN_PROGRESS',
		'DONE',
		'QA_PASSED',
		'SHIPPED'
	];
</script>

<div class="flex gap-4 overflow-x-auto pb-4 px-4">
	{#each columnOrder as status}
		<Column {status} tasks={$backlogStore.columns[status] || []} />
	{/each}
</div>
