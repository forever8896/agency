<script lang="ts">
	import { handoffsStore } from '$lib/stores/dashboard';
	import { AGENT_CONFIG } from '$lib/utils/agent-config';
    import { fly } from 'svelte/transition';

	const agents = Object.keys(AGENT_CONFIG);
	const centerX = 180;
	const centerY = 180;
	const radius = 130;

	function getPosition(index: number, total: number) {
		const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
		return {
			x: centerX + radius * Math.cos(angle),
			y: centerY + radius * Math.sin(angle)
		};
	}

	$: agentPositions = agents.reduce((acc, agent, i) => {
		acc[agent] = getPosition(i, agents.length);
		return acc;
	}, {} as Record<string, { x: number; y: number }>);

	$: recentHandoffs = $handoffsStore.slice(0, 8);
</script>

<div class="glass-panel rounded-xl p-5">
	<h3 class="text-xs font-bold text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-slate-700/50 pb-3">
		<span class="text-lg">📨</span>
		Network Traffic
	</h3>

	<div class="flex flex-col gap-4">
		<!-- SVG Visualization -->
        <div class="relative w-full aspect-square max-h-64 flex items-center justify-center bg-slate-900/30 rounded-full border border-slate-800/50 shadow-inner">
            <svg viewBox="0 0 360 360" class="w-full h-full p-4">
                <defs>
                    <marker id="arrow-neon" markerWidth="10" markerHeight="10" refX="22" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
                    </marker>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>

                <!-- Connection lines for recent handoffs -->
                {#each recentHandoffs as handoff}
                    {@const from = agentPositions[handoff.from] || agentPositions['tech-lead']}
                    {@const to = agentPositions[handoff.to] || agentPositions['dev-alpha']}
                    <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#60a5fa"
                        stroke-width="1.5"
                        stroke-opacity="0.6"
                        marker-end="url(#arrow-neon)"
                        filter="url(#glow)"
                        class="animate-pulse"
                    />
                {/each}

                <!-- Agent nodes -->
                {#each agents as agent, i}
                    {@const pos = agentPositions[agent]}
                    {@const config = AGENT_CONFIG[agent]}
                    <g transform="translate({pos.x}, {pos.y})" class="cursor-pointer hover:scale-110 transition-transform duration-200">
                        <!-- Glow -->
                        <circle r="20" fill={config.color} opacity="0.2" filter="url(#glow)" />
                        <!-- Node -->
                        <circle r="14" fill={config.color} stroke="white" stroke-width="1.5" stroke-opacity="0.2" />
                        <text text-anchor="middle" dy="0.35em" fill="white" font-size="14" pointer-events="none">
                            {config.emoji}
                        </text>
                    </g>
                {/each}
            </svg>
        </div>

		<!-- Handoff list -->
		<div class="flex-1 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
			{#each recentHandoffs as handoff (handoff.id)}
				{@const fromConfig = AGENT_CONFIG[handoff.from] || { emoji: '?', label: handoff.from }}
				{@const toConfig = AGENT_CONFIG[handoff.to] || { emoji: '?', label: handoff.to }}
				<div 
                    in:fly={{ y: 20, duration: 300 }}
                    class="flex items-center gap-3 text-xs p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/50 hover:bg-slate-800/60 transition-colors"
                >
                    <div class="flex items-center gap-1 opacity-80">
                        <span title={fromConfig.label}>{fromConfig.emoji}</span>
                        <span class="text-slate-600">→</span>
                        <span title={toConfig.label}>{toConfig.emoji}</span>
                    </div>
					<span class="text-slate-300 truncate flex-1 font-mono" title={handoff.title}>
						{handoff.title}
					</span>
				</div>
			{:else}
				<div class="text-xs text-slate-500 text-center py-4 italic">
					No recent transmissions
				</div>
			{/each}
		</div>
	</div>
</div>