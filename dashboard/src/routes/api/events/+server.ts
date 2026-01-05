import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { broadcast, broadcastDataRefresh } from '$lib/server/event-bus';

/**
 * Event POST Endpoint
 *
 * Receives events from agency via emit-event.sh
 * Broadcasts to all SSE clients
 * Refreshes data on any agent activity (standup/backlog may have changed)
 */

// Debounce data refresh to avoid hammering disk
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
let lastRefresh = 0;
const REFRESH_DEBOUNCE = 500; // ms

async function debouncedRefresh() {
	const now = Date.now();

	// If we just refreshed, skip
	if (now - lastRefresh < REFRESH_DEBOUNCE) {
		// Schedule a delayed refresh if not already scheduled
		if (!refreshTimeout) {
			refreshTimeout = setTimeout(async () => {
				refreshTimeout = null;
				lastRefresh = Date.now();
				await broadcastDataRefresh();
			}, REFRESH_DEBOUNCE);
		}
		return;
	}

	lastRefresh = now;
	await broadcastDataRefresh();
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const event = await request.json();
		const eventType = event.type || 'unknown';

		console.log(`[Event] ${eventType}: ${event.agent || ''} ${event.message || ''}`);

		// Add server timestamp
		event.timestamp = Date.now();

		// Broadcast the event itself (for real-time activity feed)
		broadcast(event);

		// Refresh data on any agent activity - files may have changed
		// Use debouncing to avoid excessive disk reads during bursts
		if (event.agent || eventType === 'refresh') {
			await debouncedRefresh();
		}

		return json({ ok: true });
	} catch (e) {
		console.error('[Event] Parse error:', e);
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}
};
