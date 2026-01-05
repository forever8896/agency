<script lang="ts">
	import { handoffsStore } from '$lib/stores/dashboard';
	import { AGENT_CONFIG } from '$lib/utils/agent-config';

	const agents = Object.keys(AGENT_CONFIG);
	const centerX = 150;
	const centerY = 150;
	const radius = 110;

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

	$: recentHandoffs = $handoffsStore.slice(0, 5);
</script>

<div class="flex flex-col gap-4 mt-6">
	<div class="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 class="font-black text-sm uppercase">DATA FLOW</h3>
    </div>

    <!-- Visualization -->
    <div class="bg-white border-2 border-black p-2 relative flex justify-center">
        <svg viewBox="0 0 300 300" class="w-full max-w-[300px] h-auto">
            <defs>
                <marker id="arrow-black" markerWidth="10" markerHeight="10" refX="22" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#000" />
                </marker>
            </defs>

            <!-- Grid Background -->
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <!-- Connection lines -->
            {#each recentHandoffs as handoff}
                {@const from = agentPositions[handoff.from] || agentPositions['tech-lead']}
                {@const to = agentPositions[handoff.to] || agentPositions['dev-alpha']}
                <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="black"
                    stroke-width="2"
                    marker-end="url(#arrow-black)"
                />
            {/each}

            <!-- Nodes -->
            {#each agents as agent, i}
                {@const pos = agentPositions[agent]}
                {@const config = AGENT_CONFIG[agent]}
                <g transform="translate({pos.x}, {pos.y})">
                    <circle r="16" fill="white" stroke="black" stroke-width="2" />
                    <!-- Use simple initial char instead of emoji -->
                    <text text-anchor="middle" dy="0.35em" font-family="monospace" font-weight="bold" font-size="12">
                        {agent.replace('dev-', '').substring(0,2).toUpperCase()}
                    </text>
                </g>
            {/each}
        </svg>
    </div>

    <!-- Simple List -->
    <div class="space-y-2">
        {#each recentHandoffs as handoff (handoff.id)}
            <div class="flex items-center gap-2 text-xs border-2 border-black bg-white p-2">
                <span class="font-bold">{handoff.from}</span>
                <span class="text-gray-400">-></span>
                <span class="font-bold">{handoff.to}</span>
                <span class="font-mono text-gray-600 truncate flex-1 border-l border-gray-300 pl-2 ml-2">
                    {handoff.title}
                </span>
            </div>
        {/each}
    </div>
</div>
