<script lang="ts">
	import type { Task, TaskStatus } from '$lib/types';
	import { COLUMN_CONFIG } from '$lib/utils/agent-config';
	import Card from './Card.svelte';
    import { flip } from 'svelte/animate';

	export let status: TaskStatus;
	export let tasks: Task[] = [];

	$: config = COLUMN_CONFIG[status] || { color: '#6b7280', bgColor: '#f3f4f6', icon: '📋' };
	$: displayName = status.replace(/_/g, ' ');
</script>

<div class="flex flex-col w-80 min-w-80 flex-shrink-0 h-full max-h-[calc(100vh-140px)]">
	<div
		class="flex items-center gap-3 px-4 py-3 rounded-t-xl backdrop-blur-md border-x border-t border-white/10"
		style="background: linear-gradient(to bottom, {config.bgColor}40, {config.bgColor}10)"
	>
		<span class="text-xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{config.icon}</span>
		<h3 class="text-sm font-bold uppercase tracking-widest text-white/90 shadow-black drop-shadow-md">
			{displayName}
		</h3>
		<span
			class="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-inner"
			style="background-color: {config.color}80; color: white"
		>
			{tasks.length}
		</span>
	</div>

	<div class="glass-panel rounded-b-xl border-t-0 p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar bg-slate-900/20">
		{#each tasks as task (task.id)}
            <div animate:flip={{ duration: 300 }}>
			    <Card {task} />
            </div>
		{:else}
			<div class="flex flex-col items-center justify-center h-32 text-slate-500/50">
                <span class="text-3xl mb-2 opacity-20">∅</span>
				<span class="text-xs uppercase tracking-widest opacity-40">Empty Sector</span>
			</div>
		{/each}
	</div>
</div>