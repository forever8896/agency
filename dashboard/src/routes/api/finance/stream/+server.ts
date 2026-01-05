import type { RequestHandler } from './$types';
import { broadcastSSE } from '$lib/server/events';

export const GET: RequestHandler = async () => {
	const encoder = new TextEncoder();

	// Generate initial data
	const generateFinanceData = () => {
		const baseNetWorth = 125000;
		const randomVariation = (Math.random() - 0.5) * 2000;

		return {
			netWorth: Math.round(baseNetWorth + randomVariation),
			netWorthChange: Math.round((Math.random() - 0.3) * 5000),
			netWorthChangePercent: Number(((Math.random() - 0.3) * 5).toFixed(2)),
			assetAllocation: [
				{ assetClass: 'Stocks', value: 65000, percentage: 52, color: '#3b82f6' },
				{ assetClass: 'Real Estate', value: 40000, percentage: 32, color: '#10b981' },
				{ assetClass: 'Crypto', value: 12000, percentage: 9.6, color: '#8b5cf6' },
				{ assetClass: 'Cash', value: 8000, percentage: 6.4, color: '#f59e0b' }
			],
			lastUpdated: Date.now()
		};
	};

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
				type: 'finance_update',
				data: generateFinanceData(),
				timestamp: Date.now()
			});

			// Send updates every 5 seconds to simulate live data
			const interval = setInterval(() => {
				try {
					send({
						type: 'finance_update',
						data: generateFinanceData(),
						timestamp: Date.now()
					});
				} catch {
					clearInterval(interval);
				}
			}, 5000);

			// Heartbeat every 30 seconds
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: heartbeat\n\n`));
				} catch {
					clearInterval(heartbeat);
				}
			}, 30000);

			// Store cleanup
			(controller as any)._cleanup = () => {
				clearInterval(interval);
				clearInterval(heartbeat);
			};
		},
		cancel(controller) {
			if ((controller as any)._cleanup) {
				(controller as any)._cleanup();
			}
			console.log('[SSE/Finance] Client disconnected');
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
