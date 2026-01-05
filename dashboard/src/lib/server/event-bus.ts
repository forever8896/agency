// Shared event bus for real-time events from agents
type EventCallback = (event: unknown) => void;

const subscribers = new Set<EventCallback>();

export function subscribe(callback: EventCallback): () => void {
	subscribers.add(callback);
	return () => subscribers.delete(callback);
}

export function broadcast(event: unknown): void {
	for (const callback of subscribers) {
		try {
			callback(event);
		} catch {
			// Client gone
		}
	}
}
