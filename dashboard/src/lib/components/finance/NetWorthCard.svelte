<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Tooltip from '../Tooltip.svelte';
	import { financeStore, netWorthStore, netWorthChangeStore, netWorthChangePercentStore, financeLiveStore } from '$lib/stores/finance';

	let animatedValue = 0;
	let targetValue = 0;
	let animationFrame: number | null = null;
	let previousValue = 0;

	// Subscribe to stores
	$: netWorth = $netWorthStore;
	$: netWorthChange = $netWorthChangeStore;
	$: changePercent = $netWorthChangePercentStore;
	$: isLive = $financeLiveStore;

	// Animate number scrolling
	function animateValue(from: number, to: number) {
		if (animationFrame) cancelAnimationFrame(animationFrame);

		const duration = 800;
		const startTime = performance.now();

		function update(currentTime: number) {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Easing function for smooth animation
			const easeOutQuart = 1 - Math.pow(1 - progress, 4);
			animatedValue = from + (to - from) * easeOutQuart;

			if (progress < 1) {
				animationFrame = requestAnimationFrame(update);
			} else {
				animatedValue = to;
				previousValue = to;
			}
		}

		animationFrame = requestAnimationFrame(update);
	}

	// Watch for value changes
	$: if (netWorth !== targetValue) {
		targetValue = netWorth;
		if (previousValue === 0) {
			// Initial load, set directly without animation
			animatedValue = netWorth;
			previousValue = netWorth;
		} else {
			animateValue(previousValue, netWorth);
		}
	}

	// Connect to SSE on mount
	onMount(() => {
		financeStore.connect();
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (animationFrame) cancelAnimationFrame(animationFrame);
		financeStore.disconnect();
	});
</script>

<div class="net-worth-card">
	<div class="card-header">
		<div class="header-left">
			<h2>Net Worth</h2>
			<Tooltip
				title="Net Worth"
				description="The total value of everything you own (assets) minus everything you owe (liabilities). This is your overall financial health score."
				learnMore="https://www.investopedia.com/terms/n/networth.asp"
				position="right"
			/>
		</div>
		{#if isLive}
			<span class="badge live">Live</span>
		{/if}
	</div>

	<div class="net-worth-value">
		<span class="currency">$</span>
		<span class="amount">{Math.round(animatedValue).toLocaleString()}</span>
	</div>

	{#if netWorthChange !== 0}
		<div class="change-indicator {netWorthChange >= 0 ? 'positive' : 'negative'}">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="change-text">{netWorthChange >= 0 ? '+' : ''}${Math.abs(netWorthChange).toLocaleString()} ({changePercent >= 0 ? '+' : ''}{changePercent}%)</span>
			<span class="change-period"> this month</span>
		</div>
	{/if}

	<div class="card-footer">
		<div class="metric">
			<span class="metric-label">Assets</span>
			<span class="metric-value">$425,000</span>
		</div>
		<div class="metric">
			<span class="metric-label">Liabilities</span>
			<span class="metric-value">$140,500</span>
		</div>
	</div>
</div>

<style>
	.net-worth-card {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
		border: 1px solid #e5e7eb;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-left h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		background: #10b981;
		color: white;
		border-radius: 9999px;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.badge.live {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.badge.live::before {
		content: '';
		width: 6px;
		height: 6px;
		background: white;
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.net-worth-value {
		margin-bottom: 1rem;
	}

	.currency {
		font-size: 1.5rem;
		font-weight: 500;
		color: #6b7280;
	}

	.amount {
		font-size: 3rem;
		font-weight: 700;
		color: #111827;
		line-height: 1;
	}

	.change-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}

	.change-indicator.positive {
		background: #ecfdf5;
		color: #059669;
	}

	.change-indicator svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.change-indicator.negative {
		background: #fef2f2;
		color: #dc2626;
	}

	.change-indicator.negative svg {
		transform: rotate(180deg);
	}

	.change-text {
		font-weight: 600;
	}

	.change-period {
		font-weight: 400;
		opacity: 0.8;
	}

	.card-footer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.metric-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.metric-value {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	@media (max-width: 767px) {
		.net-worth-card {
			padding: 1.25rem;
		}

		.currency {
			font-size: 1.25rem;
		}

		.amount {
			font-size: 2.25rem;
		}

		.card-footer {
			grid-template-columns: 1fr;
		}
	}
</style>
