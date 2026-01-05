<script lang="ts">
	export let title: string;
	export let description: string;
	export let learnMore: string | undefined = undefined;
	export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';

	let isVisible = false;
	let tooltipRef: HTMLDivElement;
	let triggerRef: HTMLButtonElement;

	function toggle() {
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			isVisible = !isVisible;
		}
	}

	function show() {
		if (typeof window !== 'undefined' && window.innerWidth >= 768) {
			isVisible = true;
		}
	}

	function hide() {
		isVisible = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (
			tooltipRef &&
			triggerRef &&
			!tooltipRef.contains(event.target as Node) &&
			!triggerRef.contains(event.target as Node)
		) {
			hide();
		}
	}

	$: if (isVisible && typeof window !== 'undefined') {
		document.addEventListener('click', handleClickOutside);
	} else if (typeof window !== 'undefined') {
		document.removeEventListener('click', handleClickOutside);
	}
</script>

<button
	bind:this={triggerRef}
	class="tooltip-trigger"
	on:click={toggle}
	on:mouseenter={show}
	on:mouseleave={hide}
	aria-label={title}
	type="button"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 20 20"
		fill="currentColor"
		class="info-icon"
	>
		<path
			fill-rule="evenodd"
			d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
			clip-rule="evenodd"
		/>
	</svg>

	{#if isVisible}
		<div
			bind:this={tooltipRef}
			class="tooltip-content tooltip-{position}"
			role="tooltip"
		>
			<div class="tooltip-header">
				<h4 class="tooltip-title">{title}</h4>
			</div>
			<p class="tooltip-description">{description}</p>
			{#if learnMore}
				<a
					href={learnMore}
					target="_blank"
					rel="noopener noreferrer"
					class="tooltip-link"
					on:click|stopPropagation
				>
					Learn more →
				</a>
			{/if}
		</div>
	{/if}
</button>

<style>
	.tooltip-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		min-height: 44px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		color: #6b7280;
		transition: all 0.2s ease;
		position: relative;
	}

	.tooltip-trigger:hover {
		background: #f3f4f6;
		color: #374151;
	}

	.tooltip-trigger:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.info-icon {
		width: 18px;
		height: 18px;
	}

	.tooltip-content {
		position: absolute;
		z-index: 1000;
		min-width: 280px;
		max-width: 320px;
		padding: 1rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
		pointer-events: auto;
		animation: tooltipFadeIn 0.2s ease-out;
	}

	@keyframes tooltipFadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.tooltip-top {
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-top::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-top-color: white;
	}

	.tooltip-bottom {
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-bottom::after {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-bottom-color: white;
	}

	.tooltip-left {
		right: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-left::after {
		content: '';
		position: absolute;
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		border: 6px solid transparent;
		border-left-color: white;
	}

	.tooltip-right {
		left: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-right::after {
		content: '';
		position: absolute;
		right: 100%;
		top: 50%;
		transform: translateY(-50%);
		border: 6px solid transparent;
		border-right-color: white;
	}

	.tooltip-header {
		margin-bottom: 0.5rem;
	}

	.tooltip-title {
		font-size: 14px;
		font-weight: 600;
		color: #111827;
		margin: 0;
		line-height: 1.4;
	}

	.tooltip-description {
		font-size: 13px;
		color: #6b7280;
		line-height: 1.5;
		margin: 0 0 0.75rem 0;
	}

	.tooltip-link {
		font-size: 12px;
		font-weight: 500;
		color: #3b82f6;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transition: color 0.2s;
	}

	.tooltip-link:hover {
		color: #2563eb;
		text-decoration: underline;
	}

	/* Mobile: full-width tooltip below trigger */
	@media (max-width: 767px) {
		.tooltip-content {
			position: fixed;
			left: 1rem;
			right: 1rem;
			min-width: auto;
			max-width: none;
			bottom: 1rem;
			top: auto !important;
			transform: none !important;
		}

		.tooltip-content::after {
			display: none;
		}
	}
</style>
