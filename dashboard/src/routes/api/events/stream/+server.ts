import type { RequestHandler } from './$types';
import { fileWatcher } from '$lib/server/file-watcher';
import { subscribe as subscribeEvents } from '$lib/server/event-bus';

export const GET: RequestHandler = async () => {
	const encoder = new TextEncoder();
	let cleanup: (() => void) | null = null;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					// Stream closed
				}
			};

			// Send initial state
			send({
				type: 'initial',
				data: fileWatcher.getState(),
				timestamp: Date.now()
			});

			// Subscribe to file changes
			const unsubFile = fileWatcher.subscribe((state) => {
				send({ type: 'file_change', data: state, timestamp: Date.now() });
			});

			// Subscribe to real-time events from agents
			const unsubEvents = subscribeEvents((event) => {
				send(event);
			});

			// Heartbeat every 30 seconds
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: heartbeat\n\n`));
				} catch {
					clearInterval(heartbeat);
				}
			}, 30000);

			// Store cleanup function
			cleanup = () => {
				clearInterval(heartbeat);
				unsubFile();
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
