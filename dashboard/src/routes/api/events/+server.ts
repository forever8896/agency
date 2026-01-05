import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { broadcast } from '$lib/server/event-bus';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const event = await request.json();
		console.log(`[Event] ${event.type}: ${event.agent || ''} ${event.task || ''}`);

		event.serverTimestamp = Date.now();
		broadcast(event);

		return json({ ok: true });
	} catch (e) {
		console.error('[Event] Parse error:', e);
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}
};
