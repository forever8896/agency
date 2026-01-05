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

<div class="h-full flex gap-4 overflow-x-auto pb-2 px-2 snap-x snap-mandatory">
	{#each columnOrder as status}
		<div class="snap-start h-full pb-2">
			<Column {status} tasks={$backlogStore.columns[status] || []} />
		</div>
	{/each}
</div>
