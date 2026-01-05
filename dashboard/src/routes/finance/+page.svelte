<script lang="ts">
	import NetWorthCard from '$lib/components/finance/NetWorthCard.svelte';
	import AssetAllocationChart from '$lib/components/finance/AssetAllocationChart.svelte';
</script>

<svelte:head>
	<title>Finance - AGENCY_OPS</title>
</svelte:head>

<div class="finance-dashboard">
	<header class="dashboard-header">
		<h1>Finance Dashboard</h1>
		<p>Track your net worth and asset allocation in real-time</p>
	</header>

	<div class="dashboard-grid">
		<NetWorthCard />
		<AssetAllocationChart />
	</div>
</div>

<style>
	.finance-dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.dashboard-header {
		margin-bottom: 2rem;
	}

	.dashboard-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.dashboard-header p {
		font-size: 1rem;
		color: #6b7280;
		margin: 0;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 1.5rem;
	}

	@media (max-width: 767px) {
		.finance-dashboard {
			padding: 1rem;
		}

		.dashboard-header h1 {
			font-size: 1.5rem;
		}

		.dashboard-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
