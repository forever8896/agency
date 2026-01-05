import type { RequestHandler } from './$types';
import { dataLoader } from '$lib/server/data-loader';
import { subscribe as subscribeEvents } from '$lib/server/event-bus';

/**
 * SSE Stream Endpoint
 *
 * Simple event-driven architecture:
 * 1. Send initial state on connect
 * 2. Forward events from event-bus (triggered by POST /api/events)
 * 3. Heartbeat to keep connection alive
 *
 * NO file watching - events come from agency via emit-event.sh
 */
export const GET: RequestHandler = async () => {
	const encoder = new TextEncoder();
	let cleanup: (() => void) | null = null;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					// Stream closed
				}
			};

			// Load and send initial state
			const initialData = await dataLoader.load();
			send({
				type: 'initial',
				data: initialData,
				timestamp: Date.now()
			});

			// Subscribe to events from event-bus
			// Events come from: POST /api/events (agency's emit-event.sh)
			const unsubEvents = subscribeEvents((event) => {
				send(event);
			});

			// Heartbeat every 30 seconds to keep connection alive
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: heartbeat\n\n`));
				} catch {
					clearInterval(heartbeat);
				}
			}, 30000);

			cleanup = () => {
				clearInterval(heartbeat);
				unsubEvents();
				console.log('[SSE] Client disconnected');
			};
		},
		cancel() {
			if (cleanup) cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};
