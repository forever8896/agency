// Server-side event management for SSE
// This module maintains state across requests

interface Event {
	type: string;
	agent?: string;
	message?: string;
	task?: string;
	status?: string;
	serverTimestamp?: number;
	data?: unknown;
}

// Connected SSE clients
const sseClients = new Set<ReadableStreamDefaultController<Uint8Array>>();

// Recent events buffer
const recentEvents: Event[] = [];
const MAX_EVENTS = 50;

export function addEvent(event: Event) {
	recentEvents.unshift(event);
	if (recentEvents.length > MAX_EVENTS) {
		recentEvents.pop();
	}
}

export function getRecentEvents(): Event[] {
	return recentEvents;
}

export function addSSEClient(controller: ReadableStreamDefaultController<Uint8Array>) {
	sseClients.add(controller);
	console.log(`[SSE] Client connected (${sseClients.size} total)`);
}

export function removeSSEClient(controller: ReadableStreamDefaultController<Uint8Array>) {
	sseClients.delete(controller);
	console.log(`[SSE] Client disconnected (${sseClients.size} remaining)`);
}

export function broadcastSSE(event: Event) {
	const data = `data: ${JSON.stringify(event)}\n\n`;
	const encoder = new TextEncoder();
	const bytes = encoder.encode(data);

	for (const controller of sseClients) {
		try {
			controller.enqueue(bytes);
		} catch {
			// Client disconnected, will be cleaned up
			sseClients.delete(controller);
		}
	}
}
