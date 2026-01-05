import { writable, derived } from 'svelte/store';

// Finance data types
interface AssetAllocation {
	assetClass: string;
	value: number;
	percentage: number;
	color: string;
}

interface FinanceData {
	netWorth: number;
	netWorthChange: number;
	netWorthChangePercent: number;
	assetAllocation: AssetAllocation[];
	lastUpdated: number;
}

interface FinanceEvent {
	type: 'finance_update';
	data: FinanceData;
	timestamp: number;
}

interface StoreState {
	data: FinanceData;
	connected: boolean;
	isLive: boolean;
}

const DEFAULT_DATA: FinanceData = {
	netWorth: 0,
	netWorthChange: 0,
	netWorthChangePercent: 0,
	assetAllocation: [],
	lastUpdated: 0
};

const DEFAULT_STATE: StoreState = {
	data: DEFAULT_DATA,
	connected: false,
	isLive: false
};

function createFinanceStore() {
	const { subscribe, set, update } = writable<StoreState>(DEFAULT_STATE);

	let eventSource: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	async function connect() {
		if (typeof window === 'undefined') return;

		// Fetch initial data
		try {
			const res = await fetch('/api/finance/data');
			if (res.ok) {
				const data = await res.json();
				update((state) => ({
					...state,
					data: {
						...DEFAULT_DATA,
						...data,
						lastUpdated: Date.now()
					}
				}));
				console.log('[Finance] Initial data loaded');
			}
		} catch (e) {
			console.error('[Finance] Failed to load initial data:', e);
		}

		// Connect to SSE for live updates
		console.log('[Finance] Connecting via SSE');
		eventSource = new EventSource('/api/finance/stream');

		eventSource.onopen = () => {
			console.log('[Finance] SSE Connected');
			update((state) => ({ ...state, connected: true, isLive: true }));
		};

		eventSource.onmessage = (event) => {
			try {
				const message: FinanceEvent = JSON.parse(event.data);
				console.log('[Finance] Event:', message.type);

				if (message.type === 'finance_update' && message.data) {
					update((state) => ({
						...state,
						data: message.data,
						isLive: true
					}));
				}
			} catch (e) {
				console.error('[Finance] Parse error:', e);
			}
		};

		eventSource.onerror = (error) => {
			console.error('[Finance] SSE Error:', error);
			update((state) => ({ ...state, connected: false, isLive: false }));

			eventSource?.close();
			eventSource = null;

			// Auto-reconnect after 2 seconds
			reconnectTimer = setTimeout(connect, 2000);
		};
	}

	function disconnect() {
		if (reconnectTimer) clearTimeout(reconnectTimer);
		eventSource?.close();
		eventSource = null;
		update((state) => ({ ...state, connected: false, isLive: false }));
	}

	async function refresh() {
		try {
			await fetch('/api/finance/refresh', { method: 'POST' });
		} catch (e) {
			console.error('[Finance] Refresh error:', e);
		}
	}

	return {
		subscribe,
		connect,
		disconnect,
		refresh
	};
}

export const financeStore = createFinanceStore();

// Derived stores
export const netWorthStore = derived(financeStore, ($f) => $f.data.netWorth);
export const netWorthChangeStore = derived(financeStore, ($f) => $f.data.netWorthChange);
export const netWorthChangePercentStore = derived(financeStore, ($f) => $f.data.netWorthChangePercent);
export const assetAllocationStore = derived(financeStore, ($f) => $f.data.assetAllocation);
export const financeConnectedStore = derived(financeStore, ($f) => $f.connected);
export const financeLiveStore = derived(financeStore, ($f) => $f.isLive);
