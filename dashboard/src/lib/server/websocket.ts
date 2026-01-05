import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { fileWatcher } from './file-watcher';
import type { WSMessage } from '../types';

let wss: WebSocketServer | null = null;

export function initWebSocket(server: HttpServer) {
	if (wss) {
		console.log('[WebSocket] Already initialized');
		return;
	}

	wss = new WebSocketServer({ server, path: '/ws' });

	wss.on('connection', (ws) => {
		console.log('[WebSocket] Client connected');

		// Send initial state
		const initialMessage: WSMessage = {
			type: 'initial',
			data: fileWatcher.getState(),
			timestamp: Date.now()
		};
		ws.send(JSON.stringify(initialMessage));

		// Subscribe to file changes
		const unsubscribe = fileWatcher.subscribe((state) => {
			if (ws.readyState === WebSocket.OPEN) {
				const updateMessage: WSMessage = {
					type: 'update',
					data: state,
					timestamp: Date.now()
				};
				ws.send(JSON.stringify(updateMessage));
			}
		});

		ws.on('close', () => {
			console.log('[WebSocket] Client disconnected');
			unsubscribe();
		});

		ws.on('error', (error) => {
			console.error('[WebSocket] Error:', error);
			unsubscribe();
		});
	});

	console.log('[WebSocket] Server initialized on /ws');
}

export function getWSS(): WebSocketServer | null {
	return wss;
}
