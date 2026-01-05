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

// Connection state for better UI feedback
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface StoreState extends DashboardState {
	connected: boolean;
	connectionState: ConnectionState;
	lastUpdate: number;
	recentEvents: RealtimeEvent[];
	retryCount: number;
}

// Reconnection configuration
const RECONNECT_CONFIG = {
	baseDelay: 2000,        // Start with 2 seconds
	maxDelay: 60000,        // Cap at 60 seconds
	maxRetries: 10,         // Give up after 10 attempts
	backoffMultiplier: 1.5  // Multiply delay by 1.5 each retry
};

function createDashboardStore() {
	const { subscribe, set, update } = writable<StoreState>({
		backlog: { columns: {} },
		agents: [],
		handoffs: [],
		connected: false,
		connectionState: 'disconnected',
		lastUpdate: 0,
		recentEvents: [],
		retryCount: 0
	});

	let eventSource: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let currentRetryCount = 0;

	// Calculate delay with exponential backoff
	function getReconnectDelay(): number {
		const delay = RECONNECT_CONFIG.baseDelay * Math.pow(RECONNECT_CONFIG.backoffMultiplier, currentRetryCount);
		return Math.min(delay, RECONNECT_CONFIG.maxDelay);
	}

	async function connect(isRetry = false) {
		if (typeof window === 'undefined') return;

		// Update state to show we're connecting/reconnecting
		update((state) => ({
			...state,
			connectionState: isRetry ? 'reconnecting' : 'connecting',
			retryCount: currentRetryCount
		}));

		// Fetch initial data first
		try {
			const res = await fetch('/api/data');
			if (res.ok) {
				const data = await res.json();
				update((state) => ({
					...state,
					...data,
					lastUpdate: Date.now()
				}));
				console.log('[Store] Initial data loaded');
			}
		} catch (e) {
			console.error('[Store] Failed to load initial data:', e);
		}

		// Then connect SSE for real-time updates
		const sseUrl = `/api/events/stream`;

		console.log(`[Store] ${isRetry ? 'Reconnecting' : 'Connecting'} via SSE to`, sseUrl, isRetry ? `(attempt ${currentRetryCount + 1}/${RECONNECT_CONFIG.maxRetries})` : '');
		eventSource = new EventSource(sseUrl);

		eventSource.onopen = () => {
			console.log('[Store] SSE Connected');
			// Reset retry count on successful connection
			currentRetryCount = 0;
			update((state) => ({
				...state,
				connected: true,
				connectionState: 'connected',
				retryCount: 0
			}));
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

			// Close existing connection
			eventSource?.close();
			eventSource = null;

			// Check if we've exceeded max retries (circuit breaker)
			if (currentRetryCount >= RECONNECT_CONFIG.maxRetries) {
				console.error(`[Store] Max retries (${RECONNECT_CONFIG.maxRetries}) exceeded. Giving up. Call reconnect() to try again.`);
				update((state) => ({
					...state,
					connected: false,
					connectionState: 'failed',
					retryCount: currentRetryCount
				}));
				return; // Stop trying - circuit breaker open
			}

			// Calculate delay with exponential backoff
			const delay = getReconnectDelay();
			currentRetryCount++;

			console.log(`[Store] Will reconnect in ${Math.round(delay / 1000)}s (attempt ${currentRetryCount}/${RECONNECT_CONFIG.maxRetries})`);

			update((state) => ({
				...state,
				connected: false,
				connectionState: 'reconnecting',
				retryCount: currentRetryCount
			}));

			// Schedule reconnection with backoff
			reconnectTimer = setTimeout(() => connect(true), delay);
		};
	}

	function disconnect() {
		if (reconnectTimer) clearTimeout(reconnectTimer);
		eventSource?.close();
		eventSource = null;
		currentRetryCount = 0;
		update((state) => ({
			...state,
			connected: false,
			connectionState: 'disconnected',
			retryCount: 0
		}));
	}

	// Manual reconnect - resets circuit breaker and tries again
	function reconnect() {
		console.log('[Store] Manual reconnect requested - resetting circuit breaker');
		disconnect();
		connect(false);
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
		reconnect,
		refresh
	};
}

export const dashboardStore = createDashboardStore();

// Derived stores for specific data
export const backlogStore = derived(dashboardStore, ($d) => $d.backlog);
export const agentsStore = derived(dashboardStore, ($d) => $d.agents);
export const handoffsStore = derived(dashboardStore, ($d) => $d.handoffs);
export const connectionStore = derived(dashboardStore, ($d) => $d.connected);
export const connectionStateStore = derived(dashboardStore, ($d) => $d.connectionState);
export const retryCountStore = derived(dashboardStore, ($d) => $d.retryCount);
export const lastUpdateStore = derived(dashboardStore, ($d) => $d.lastUpdate);
export const recentEventsStore = derived(dashboardStore, ($d) => $d.recentEvents);
