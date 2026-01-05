import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fileWatcher } from '$lib/server/file-watcher';

export const GET: RequestHandler = async () => {
	try {
		const state = fileWatcher.getState();
		return json(state);
	} catch (e) {
		console.error('[API/data] Error:', e);
		return json({ backlog: { columns: {} }, agents: [], handoffs: [] }, { status: 500 });
	}
};
