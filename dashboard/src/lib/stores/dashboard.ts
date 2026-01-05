import { writable, derived } from 'svelte/store';
import type { DashboardState, BacklogState, AgentStatus, Handoff, WSMessage } from '../types';

interface StoreState extends DashboardState {
	connected: boolean;
	lastUpdate: number;
}

function createDashboardStore() {
	const { subscribe, set, update } = writable<StoreState>({
		backlog: { columns: {} },
		agents: [],
		handoffs: [],
		connected: false,
		lastUpdate: 0
	});

	let ws: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	function connect() {
		if (typeof window === 'undefined') return;

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws`;

		console.log('[Store] Connecting to', wsUrl);
		ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			console.log('[Store] Connected');
			update((state) => ({ ...state, connected: true }));
		};

		ws.onmessage = (event) => {
			try {
				const message: WSMessage = JSON.parse(event.data);
				console.log('[Store] Message:', message.type);

				if (message.type === 'initial' || message.type === 'update') {
					update((state) => ({
						...state,
						...message.data,
						lastUpdate: message.timestamp || Date.now()
					}));
				}
			} catch (e) {
				console.error('[Store] Parse error:', e);
			}
		};

		ws.onclose = () => {
			console.log('[Store] Disconnected');
			update((state) => ({ ...state, connected: false }));
			// Auto-reconnect after 3 seconds
			reconnectTimer = setTimeout(connect, 3000);
		};

		ws.onerror = (error) => {
			console.error('[Store] Error:', error);
		};
	}

	function disconnect() {
		if (reconnectTimer) clearTimeout(reconnectTimer);
		ws?.close();
		ws = null;
	}

	return {
		subscribe,
		connect,
		disconnect
	};
}

export const dashboardStore = createDashboardStore();

// Derived stores for specific data
export const backlogStore = derived(dashboardStore, ($d) => $d.backlog);
export const agentsStore = derived(dashboardStore, ($d) => $d.agents);
export const handoffsStore = derived(dashboardStore, ($d) => $d.handoffs);
export const connectionStore = derived(dashboardStore, ($d) => $d.connected);
export const lastUpdateStore = derived(dashboardStore, ($d) => $d.lastUpdate);
