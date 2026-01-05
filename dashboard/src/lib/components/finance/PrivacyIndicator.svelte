<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	export let mode: 'local' | 'cloud' = 'local';

	let showPanel = false;

	const privacyData = {
		local: {
			icon: 'lock-closed',
			label: 'Local Only',
			color: '#10b981',
			description: 'Your data never leaves this device',
			items: [
				{ name: 'Net worth calculations', stored: 'Browser memory only', shared: 'Never' },
				{ name: 'Asset allocation', stored: 'Browser memory only', shared: 'Never' },
				{ name: 'Historical trends', stored: 'Session storage', shared: 'Never' }
			]
		},
		cloud: {
			icon: 'cloud',
			label: 'Cloud Sync',
			color: '#3b82f6',
			description: 'Data encrypted and synced securely',
			items: [
				{ name: 'Net worth calculations', stored: 'Encrypted at rest', shared: 'Synced to your devices' },
				{ name: 'Asset allocation', stored: 'Encrypted at rest', shared: 'Synced to your devices' },
				{ name: 'Historical trends', stored: 'Encrypted at rest', shared: 'Synced to your devices' }
			]
		}
	};

	function togglePanel() {
		showPanel = !showPanel;
		dispatch('toggle', { open: showPanel });
	}

	function closePanel() {
		showPanel = false;
		dispatch('toggle', { open: false });
	}

	async function exportData(format: 'csv' | 'json') {
		const data = privacyData[mode].items;
		let content, filename, type;

		if (format === 'json') {
			content = JSON.stringify(data, null, 2);
			filename = 'privacy-data.json';
			type = 'application/json';
		} else {
			const headers = ['Data Point', 'Stored', 'Shared'];
			const rows = data.map((item) => [item.name, item.stored, item.shared]);
			content = [headers, ...rows].map((row) => row.join(',')).join('\n');
			filename = 'privacy-data.csv';
			type = 'text/csv';
		}

		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		dispatch('export', { format });
	}

	$current: currentData = privacyData[mode];
</script>

<div class="privacy-indicator">
	<button
		class="privacy-button"
		class:cloud={mode === 'cloud'}
		on:click={togglePanel}
		aria-label="Privacy settings"
	>
		{#if mode === 'local'}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
				<path
					fill-rule="evenodd"
					d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
					clip-rule="evenodd"
				/>
			</svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
				<path
					fill-rule="evenodd"
					d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
		{/if}
		<span class="label">{currentData.label}</span>
	</button>

	{#if showPanel}
		<div class="privacy-panel" transition:fade on:clickoutside={closePanel}>
			<div class="panel-header">
				<div class="header-content">
					<h3>Data Transparency</h3>
					<p class="description">{currentData.description}</p>
				</div>
				<button class="close-btn" on:click={closePanel} aria-label="Close">✕</button>
			</div>

			<div class="data-list">
				{#each currentData.items as item}
					<div class="data-item">
						<span class="item-name">{item.name}</span>
						<div class="item-details">
							<span class="detail">📁 {item.stored}</span>
							<span class="detail">🔒 {item.shared}</span>
						</div>
					</div>
				{/each}
			</div>

			<div class="export-section">
				<p class="export-label">Export your data:</p>
				<div class="export-buttons">
					<button class="export-btn" on:click={() => exportData('csv')}>
						<span>📄</span> CSV
					</button>
					<button class="export-btn" on:click={() => exportData('json')}>
						<span>{'{}'}</span> JSON
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.privacy-indicator {
		position: relative;
		display: inline-block;
	}

	.privacy-button {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 44px;
		min-width: 44px;
	}

	.privacy-button:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}

	.privacy-button.cloud {
		background: #eff6ff;
		border-color: #bfdbfe;
		color: #1e40af;
	}

	.privacy-button.cloud:hover {
		background: #dbeafe;
	}

	.privacy-button .icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.privacy-button .label {
		font-size: 0.8125rem;
	}

	.privacy-panel {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		width: 320px;
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
		z-index: 1000;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.25rem;
		border-bottom: 1px solid #e5e7eb;
		gap: 0.75rem;
	}

	.header-content h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 0.25rem 0;
	}

	.header-content .description {
		font-size: 0.8125rem;
		color: #6b7280;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		color: #9ca3af;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
		flex-shrink: 0;
		min-width: 32px;
		min-height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: #374151;
		background: #f3f4f6;
		border-radius: 6px;
	}

	.data-list {
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.data-item {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 8px;
	}

	.item-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
	}

	.item-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-details .detail {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.export-section {
		padding: 1rem 1.25rem;
		background: #f9fafb;
		border-top: 1px solid #e5e7eb;
	}

	.export-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.625rem 0;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.export-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.export-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.625rem 0.875rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 40px;
	}

	.export-btn:hover {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.export-btn span {
		font-size: 1rem;
	}

	@media (max-width: 767px) {
		.privacy-panel {
			position: fixed;
			top: auto;
			bottom: 0;
			right: 0;
			left: 0;
			width: 100%;
			border-radius: 16px 16px 0 0;
			max-height: 80vh;
			overflow-y: auto;
		}

		.panel-header {
			padding: 1rem;
		}

		.data-list {
			padding: 0.75rem 1rem;
		}

		.export-section {
			padding: 0.75rem 1rem;
		}
	}
</style>
