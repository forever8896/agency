import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { broadcast, broadcastDataRefresh } from '$lib/server/event-bus';

/**
 * Event POST Endpoint
 *
 * Receives events from agency via emit-event.sh
 * Broadcasts to all SSE clients
 *
 * Event types that trigger data refresh:
 * - task_complete, task_claimed, status_change
 * - file_updated, refresh
 */

// Events that indicate file state changed - trigger data refresh
const DATA_CHANGE_EVENTS = new Set([
	'task_complete',
	'task_claimed',
	'status_change',
	'file_updated',
	'refresh',
	'session_ended'
]);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const event = await request.json();
		const eventType = event.type || 'unknown';

		console.log(`[Event] ${eventType}: ${event.agent || ''} ${event.message || ''}`);

		// Add server timestamp
		event.timestamp = Date.now();

		// Broadcast the event itself
		broadcast(event);

		// If this event indicates data changed, also send fresh data
		if (DATA_CHANGE_EVENTS.has(eventType)) {
			await broadcastDataRefresh();
		}

		return json({ ok: true });
	} catch (e) {
		console.error('[Event] Parse error:', e);
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}
};
