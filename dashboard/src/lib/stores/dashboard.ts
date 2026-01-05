import { writable, derived } from 'svelte/store';
import type { DashboardState, BacklogState, AgentStatus, Handoff, WSMessage } from '../types';

// Real-time event from bash scripts
interface RealtimeEvent {
	type: string;
	agent?: string;
	message?: string;
	task?: string;
	status?: string;
	from?: string;
	to?: string;
	timestamp?: string;
	serverTimestamp?: number;
	data?: DashboardState;
}

interface StoreState extends DashboardState {
	connected: boolean;
	lastUpdate: number;
	recentEvents: RealtimeEvent[];
}

function createDashboardStore() {
	const { subscribe, set, update } = writable<StoreState>({
		backlog: { columns: {} },
		agents: [],
		handoffs: [],
		connected: false,
		lastUpdate: 0,
		recentEvents: []
	});

	let eventSource: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	function connect() {
		if (typeof window === 'undefined') return;

		// Use SSE for real-time events (faster than WebSocket for one-way data)
		const sseUrl = `/api/events/stream`;

		console.log('[Store] Connecting via SSE to', sseUrl);
		eventSource = new EventSource(sseUrl);

		eventSource.onopen = () => {
			console.log('[Store] SSE Connected');
			update((state) => ({ ...state, connected: true }));
		};

		eventSource.onmessage = (event) => {
			try {
				const message: RealtimeEvent = JSON.parse(event.data);
				console.log('[Store] Event:', message.type, message.agent || '');

				// Handle full state updates (initial, file_change, refresh)
				if (message.type === 'initial' || message.type === 'file_change' || message.type === 'refresh') {
					if (message.data) {
						update((state) => ({
							...state,
							...message.data,
							lastUpdate: message.serverTimestamp || Date.now()
						}));
					}
				}

				// Handle real-time events from agents (add to recent events)
				if (message.agent) {
					update((state) => ({
						...state,
						lastUpdate: message.serverTimestamp || Date.now(),
						// Keep last 20 events
						recentEvents: [message, ...state.recentEvents].slice(0, 20)
					}));
				}
			} catch (e) {
				console.error('[Store] Parse error:', e);
			}
		};

		eventSource.onerror = (error) => {
			console.error('[Store] SSE Error:', error);
			update((state) => ({ ...state, connected: false }));

			// Close and reconnect
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
	}

	// Manually trigger a refresh from the server
	async function refresh() {
		try {
			await fetch('/api/refresh', { method: 'POST' });
		} catch (e) {
			console.error('[Store] Refresh error:', e);
		}
	}

	return {
		subscribe,
		connect,
		disconnect,
		refresh
	};
}

export const dashboardStore = createDashboardStore();

// Derived stores for specific data
export const backlogStore = derived(dashboardStore, ($d) => $d.backlog);
export const agentsStore = derived(dashboardStore, ($d) => $d.agents);
export const handoffsStore = derived(dashboardStore, ($d) => $d.handoffs);
export const connectionStore = derived(dashboardStore, ($d) => $d.connected);
export const lastUpdateStore = derived(dashboardStore, ($d) => $d.lastUpdate);
export const recentEventsStore = derived(dashboardStore, ($d) => $d.recentEvents);
