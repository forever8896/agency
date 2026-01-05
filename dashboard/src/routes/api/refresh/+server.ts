import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { broadcastSSE } from '$lib/server/events';

export const POST: RequestHandler = async () => {
	// Broadcast refresh event to all clients
	broadcastSSE({
		type: 'refresh',
		serverTimestamp: Date.now()
	});

	return json({ ok: true });
};
