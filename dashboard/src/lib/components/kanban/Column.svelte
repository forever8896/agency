<script lang="ts">
	import type { Task, TaskStatus } from '$lib/types';
	import { COLUMN_CONFIG } from '$lib/utils/agent-config';
	import Card from './Card.svelte';
    import { flip } from 'svelte/animate';

	export let status: TaskStatus;
	export let tasks: Task[] = [];

	$: config = COLUMN_CONFIG[status] || { color: '#000', bgColor: '#fff', icon: '' };
	$: displayName = status.replace(/_/g, ' ');
</script>

<div class="flex flex-col w-80 min-w-80 flex-shrink-0 h-full max-h-full">
    <!-- Header -->
	<div class="flex items-center justify-between px-4 py-3 border-2 border-black bg-white mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <div class="flex items-center gap-2">
            <h3 class="text-sm font-black uppercase tracking-tight text-black">
                {displayName}
            </h3>
        </div>
		<span class="font-mono text-xs font-bold bg-black text-white px-2 py-0.5">
			{tasks.length}
		</span>
	</div>

    <!-- Drop Zone / List -->
	<div class="border-2 border-black bg-[#f8f8f8] p-2 overflow-y-auto flex-1 custom-scrollbar">
		{#each tasks as task (task.id)}
            <div animate:flip={{ duration: 200 }}>
			    <Card {task} />
            </div>
		{:else}
			<div class="flex flex-col items-center justify-center h-24 opacity-40">
                <div class="w-8 h-8 border-2 border-dashed border-black rounded-full mb-2"></div>
			</div>
		{/each}
	</div>
</div>
