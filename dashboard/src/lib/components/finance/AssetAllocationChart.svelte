<script lang="ts">
	import Tooltip from '../Tooltip.svelte';

	interface AssetClass {
		name: string;
		value: number;
		percent: number;
		color: string;
		tooltipTitle: string;
		tooltipDescription: string;
		tooltipLink?: string;
	}

	const assetClasses: AssetClass[] = [
		{
			name: 'Stocks',
			value: 175000,
			percent: 41.2,
			color: '#3b82f6',
			tooltipTitle: 'Stocks',
			tooltipDescription:
				'Shares of publicly traded companies. Stocks offer growth potential but come with higher short-term volatility.',
			tooltipLink: 'https://www.investopedia.com/terms/s/stock.asp'
		},
		{
			name: 'Real Estate',
			value: 125000,
			percent: 29.4,
			color: '#10b981',
			tooltipTitle: 'Real Estate',
			tooltipDescription:
				'Property investments including your home and rental properties. Real estate provides both appreciation and rental income potential.',
			tooltipLink: 'https://www.investopedia.com/terms/r/realestate.asp'
		},
		{
			name: 'Cash',
			value: 75000,
			percent: 17.6,
			color: '#f59e0b',
			tooltipTitle: 'Cash & Equivalents',
			tooltipDescription:
				'Money in checking, savings, and money market accounts. Cash provides stability and liquidity for emergencies.',
			tooltipLink: 'https://www.investopedia.com/terms/c/cashandequivalents.asp'
		},
		{
			name: 'Crypto',
			value: 35000,
			percent: 8.2,
			color: '#8b5cf6',
			tooltipTitle: 'Cryptocurrency',
			tooltipDescription:
				'Digital assets like Bitcoin and Ethereum. High-risk, high-reward investments with extreme volatility.',
			tooltipLink: 'https://www.investopedia.com/terms/c/cryptocurrency.asp'
		},
		{
			name: 'Other',
			value: 15000,
			percent: 3.6,
			color: '#6b7280',
			tooltipTitle: 'Other Investments',
			tooltipDescription:
				'Alternative investments including bonds, commodities, and collectibles. These can diversify your portfolio.'
		}
	];

	const strokeWidth = 20;
	const radius = 80;
	const circumference = 2 * Math.PI * radius;

	function getStrokeDashArray(percent: number): string {
		const dashLength = (percent / 100) * circumference;
		return `${dashLength} ${circumference}`;
	}
</script>

<div class="asset-allocation-chart">
	<div class="card-header">
		<div class="header-left">
			<h2>Asset Allocation</h2>
			<Tooltip
				title="Asset Allocation"
				description="How your investments are distributed across different types of assets. A diversified allocation helps balance risk and reward."
				learnMore="https://www.investopedia.com/terms/a/assetallocation.asp"
				position="right"
			/>
		</div>
	</div>

	<div class="chart-container">
		<svg viewBox="0 0 200 200" class="donut-chart">
			<circle cx="100" cy="100" r={radius} fill="none" stroke="#f3f4f6" stroke-width={strokeWidth} />

			{#each assetClasses as asset, i}
				{@const offset = i === 0 ? 0 : -(assetClasses.slice(0, i).reduce((sum, a) => sum + a.percent, 0) / 100) * circumference}
				<circle
					cx="100"
					cy="100"
					r={radius}
					fill="none"
					stroke={asset.color}
					stroke-width={strokeWidth}
					stroke-dasharray={getStrokeDashArray(asset.percent)}
					stroke-dashoffset={offset}
					transform="rotate(-90 100 100)"
					class="chart-segment"
				/>
			{/each}

			<text x="100" y="95" text-anchor="middle" class="total-label">$425K</text>
			<text x="100" y="115" text-anchor="middle" class="total-sublabel">Total Assets</text>
		</svg>
	</div>

	<div class="legend">
		{#each assetClasses as asset (asset.name)}
			<div class="legend-item">
				<div class="legend-header">
					<div class="legend-color" style="background: {asset.color}" />
					<span class="legend-name">{asset.name}</span>
					<Tooltip
						title={asset.tooltipTitle}
						description={asset.tooltipDescription}
						learnMore={asset.tooltipLink}
						position="top"
					/>
				</div>
				<div class="legend-values">
					<span class="legend-percent">{asset.percent}%</span>
					<span class="legend-value">${asset.value.toLocaleString()}</span>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.asset-allocation-chart {
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

	.chart-container {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.donut-chart {
		width: 200px;
		height: 200px;
	}

	.chart-segment {
		transition: opacity 0.2s ease;
	}

	.chart-segment:hover {
		opacity: 0.8;
	}

	.total-label {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}

	.total-sublabel {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.legend-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.legend-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.legend-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.legend-values {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.legend-percent {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
		min-width: 2.5rem;
		text-align: right;
	}

	.legend-value {
		font-size: 0.875rem;
		color: #6b7280;
	}

	@media (max-width: 767px) {
		.asset-allocation-chart {
			padding: 1.25rem;
		}

		.legend-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.legend-values {
			align-self: flex-end;
		}
	}
</style>
