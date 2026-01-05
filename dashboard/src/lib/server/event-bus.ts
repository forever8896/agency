import { dataLoader } from './data-loader';

/**
 * Central event bus for real-time dashboard updates
 *
 * Architecture:
 * - Agency scripts POST events via emit-event.sh
 * - Event bus broadcasts to all SSE clients
 * - No file watching - events are explicit
 */

interface DashboardEvent {
	type: string;
	agent?: string;
	message?: string;
	task?: string;
	status?: string;
	timestamp: number;
	data?: unknown;
}

type EventCallback = (event: DashboardEvent) => void;

const subscribers = new Set<EventCallback>();

export function subscribe(callback: EventCallback): () => void {
	subscribers.add(callback);
	return () => subscribers.delete(callback);
}

export function getSubscriberCount(): number {
	return subscribers.size;
}

/**
 * Broadcast an event to all connected SSE clients
 */
export function broadcast(event: DashboardEvent): void {
	for (const callback of subscribers) {
		try {
			callback(event);
		} catch {
			// Client gone, will be cleaned up
		}
	}
}

/**
 * Broadcast a data refresh event with current state
 * Call this after receiving an event that indicates files changed
 */
export async function broadcastDataRefresh(): Promise<void> {
	dataLoader.invalidate();
	const data = await dataLoader.load();

	broadcast({
		type: 'data_refresh',
		timestamp: Date.now(),
		data
	});
}
