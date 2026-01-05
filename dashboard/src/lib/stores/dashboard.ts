import { writable, derived } from 'svelte/store';
import type { DashboardState } from '../types';

/**
 * Dashboard Store
 *
 * Simple event-driven architecture:
 * - Connect to SSE stream
 * - Receive initial state
 * - Receive updates when agency posts events
 * - No polling, no complexity
 */

interface AgentEvent {
	type: string;
	agent?: string;
	message?: string;
	task?: string;
	status?: string;
	timestamp: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface StoreState extends DashboardState {
	connectionState: ConnectionState;
	lastUpdate: number;
	recentEvents: AgentEvent[];
}

// Reconnection with exponential backoff
const RECONNECT = {
	baseDelay: 2000,
	maxDelay: 30000,
	maxRetries: 5
};

function createDashboardStore() {
	const { subscribe, update } = writable<StoreState>({
		backlog: { columns: {} },
		agents: [],
		handoffs: [],
		connectionState: 'disconnected',
		lastUpdate: 0,
		recentEvents: []
	});

	let eventSource: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let retryCount = 0;

	function connect() {
		if (typeof window === 'undefined') return;
		if (eventSource?.readyState === EventSource.OPEN) return;

		// Clean up existing
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}

		update(s => ({ ...s, connectionState: retryCount > 0 ? 'reconnecting' : 'connecting' }));

		eventSource = new EventSource('/api/events/stream');

		eventSource.onopen = () => {
			console.log('[Dashboard] Connected');
			retryCount = 0;
			update(s => ({ ...s, connectionState: 'connected' }));
		};

		eventSource.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data);

				// Handle data updates (initial, data_refresh)
				if (msg.type === 'initial' || msg.type === 'data_refresh') {
					if (msg.data) {
						console.log('[Dashboard] Data update:', msg.type);
						update(s => ({
							...s,
							...msg.data,
							lastUpdate: msg.timestamp || Date.now()
						}));
					}
				}

				// Handle agent events (add to recent events list)
				if (msg.agent) {
					update(s => ({
						...s,
						recentEvents: [msg, ...s.recentEvents].slice(0, 20)
					}));
				}
			} catch (e) {
				console.error('[Dashboard] Parse error:', e);
			}
		};

		eventSource.onerror = () => {
			console.log('[Dashboard] Connection error');
			eventSource?.close();
			eventSource = null;

			if (retryCount >= RECONNECT.maxRetries) {
				update(s => ({ ...s, connectionState: 'failed' }));
				return;
			}

			const delay = Math.min(
				RECONNECT.baseDelay * Math.pow(2, retryCount),
				RECONNECT.maxDelay
			);
			retryCount++;

			update(s => ({ ...s, connectionState: 'reconnecting' }));
			reconnectTimer = setTimeout(connect, delay);
		};
	}

	function disconnect() {
		if (reconnectTimer) clearTimeout(reconnectTimer);
		eventSource?.close();
		eventSource = null;
		retryCount = 0;
		update(s => ({ ...s, connectionState: 'disconnected' }));
	}

	function reconnect() {
		retryCount = 0;
		disconnect();
		connect();
	}

	async function refresh() {
		try {
			await fetch('/api/refresh', { method: 'POST' });
		} catch (e) {
			console.error('[Dashboard] Refresh error:', e);
		}
	}

	return {
		subscribe,
		connect,
		disconnect,
		reconnect,
		refresh
	};
}

export const dashboardStore = createDashboardStore();

// Derived stores for components
export const backlogStore = derived(dashboardStore, $d => $d.backlog);
export const agentsStore = derived(dashboardStore, $d => $d.agents);
export const handoffsStore = derived(dashboardStore, $d => $d.handoffs);
export const connectionStateStore = derived(dashboardStore, $d => $d.connectionState);
export const lastUpdateStore = derived(dashboardStore, $d => $d.lastUpdate);
export const recentEventsStore = derived(dashboardStore, $d => $d.recentEvents);
