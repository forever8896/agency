<script lang="ts">
	import { handoffsStore } from '$lib/stores/dashboard';
	import { AGENT_CONFIG } from '$lib/utils/agent-config';

	const agents = Object.keys(AGENT_CONFIG);
	const centerX = 180;
	const centerY = 180;
	const radius = 140;

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

<div class="bg-white rounded-xl shadow-sm p-4">
	<h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
		<span>📨</span>
		Recent Handoffs
	</h3>

	<div class="flex gap-6">
		<!-- SVG Visualization -->
		<svg viewBox="0 0 360 360" class="w-48 h-48 flex-shrink-0">
			<!-- Connection lines for recent handoffs -->
			{#each recentHandoffs as handoff}
				{@const from = agentPositions[handoff.from] || agentPositions['tech-lead']}
				{@const to = agentPositions[handoff.to] || agentPositions['dev-alpha']}
				<line
					x1={from.x}
					y1={from.y}
					x2={to.x}
					y2={to.y}
					stroke="#e5e7eb"
					stroke-width="2"
					marker-end="url(#arrow)"
				/>
			{/each}

			<!-- Arrow marker -->
			<defs>
				<marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
					<path d="M0,0 L0,6 L8,3 z" fill="#9ca3af" />
				</marker>
			</defs>

			<!-- Agent nodes -->
			{#each agents as agent, i}
				{@const pos = agentPositions[agent]}
				{@const config = AGENT_CONFIG[agent]}
				<g transform="translate({pos.x}, {pos.y})">
					<circle r="24" fill={config.color} opacity="0.15" />
					<circle r="18" fill={config.color} />
					<text text-anchor="middle" dy="0.35em" fill="white" font-size="14">
						{config.emoji}
					</text>
				</g>
			{/each}
		</svg>

		<!-- Handoff list -->
		<div class="flex-1 space-y-2 max-h-48 overflow-y-auto">
			{#each recentHandoffs as handoff (handoff.id)}
				{@const fromConfig = AGENT_CONFIG[handoff.from] || { emoji: '?', label: handoff.from }}
				{@const toConfig = AGENT_CONFIG[handoff.to] || { emoji: '?', label: handoff.to }}
				<div class="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
					<span title={fromConfig.label}>{fromConfig.emoji}</span>
					<span class="text-gray-400">→</span>
					<span title={toConfig.label}>{toConfig.emoji}</span>
					<span class="text-gray-600 truncate flex-1" title={handoff.title}>
						{handoff.title}
					</span>
				</div>
			{:else}
				<p class="text-sm text-gray-400 text-center py-4">
					No handoffs yet
				</p>
			{/each}
		</div>
	</div>
</div>
