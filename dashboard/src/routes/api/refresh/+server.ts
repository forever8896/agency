import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { broadcastDataRefresh } from '$lib/server/event-bus';

/**
 * Manual Refresh Endpoint
 *
 * Triggers a data refresh and broadcasts to all SSE clients
 */
export const POST: RequestHandler = async () => {
	await broadcastDataRefresh();
	return json({ ok: true });
};
