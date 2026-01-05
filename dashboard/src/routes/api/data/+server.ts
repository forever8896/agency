import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dataLoader } from '$lib/server/data-loader';

/**
 * Data GET Endpoint
 *
 * Returns current dashboard state by reading markdown files
 * Uses short-lived cache to prevent excessive disk reads
 */
export const GET: RequestHandler = async () => {
	try {
		const state = await dataLoader.load();
		return json(state);
	} catch (e) {
		console.error('[API/data] Error:', e);
		return json({ backlog: { columns: {} }, agents: [], handoffs: [] }, { status: 500 });
	}
};
