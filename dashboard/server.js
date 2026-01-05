import { createServer } from 'http';
import { handler } from './build/handler.js';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import { readFile, readdir } from 'fs/promises';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.AGENCY_DATA_DIR || path.resolve(__dirname, '../agency/data');
const AGENCY_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;

// Initialize data directory from templates if it doesn't exist
// Mirrors the init_data() function in agency.sh
function initDataDir() {
	if (!existsSync(DATA_DIR)) {
		console.log(`[Server] Creating data directory: ${DATA_DIR}`);
		mkdirSync(DATA_DIR, { recursive: true });
		mkdirSync(path.join(DATA_DIR, 'handoffs'), { recursive: true });
	}

	const templates = ['inbox.md', 'backlog.md', 'board.md', 'standup.md', 'metrics.md'];
	for (const file of templates) {
		const dataFile = path.join(DATA_DIR, file);
		const templateFile = path.join(AGENCY_DIR, file);

		if (!existsSync(dataFile) && existsSync(templateFile)) {
			console.log(`[Server] Initializing ${file} from template`);
			copyFileSync(templateFile, dataFile);
		}
	}
}

// Initialize on startup
initDataDir();

// ============================================================================
// SSE (Server-Sent Events) - For real-time push from bash scripts
// Much faster than file watching: bash POSTs event → instant broadcast to UI
// ============================================================================

const sseClients = new Set();

function broadcastSSE(event) {
	const data = `data: ${JSON.stringify(event)}\n\n`;
	for (const client of sseClients) {
		client.write(data);
	}
}

// Handle incoming events from bash scripts
function handleEventPost(req, res) {
	let body = '';
	req.on('data', chunk => body += chunk);
	req.on('end', () => {
		try {
			const event = JSON.parse(body);
			console.log(`[Event] ${event.type}: ${event.agent || ''} ${event.task || ''}`);

			// Add server timestamp
			event.serverTimestamp = Date.now();

			// Broadcast to all SSE clients immediately (sub-10ms)
			broadcastSSE(event);

			// Also broadcast via WebSocket for backwards compatibility
			broadcast(currentState);

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ ok: true }));
		} catch (e) {
			console.error('[Event] Parse error:', e);
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Invalid JSON' }));
		}
	});
}

// SSE stream endpoint - browsers connect here for real-time updates
function handleSSEStream(req, res) {
	console.log('[SSE] Client connected');

	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Access-Control-Allow-Origin': '*'
	});

	// Send initial state
	res.write(`data: ${JSON.stringify({ type: 'initial', data: currentState, timestamp: Date.now() })}\n\n`);

	// Keep connection alive with heartbeat
	const heartbeat = setInterval(() => {
		res.write(`: heartbeat\n\n`);
	}, 30000);

	sseClients.add(res);

	req.on('close', () => {
		console.log('[SSE] Client disconnected');
		clearInterval(heartbeat);
		sseClients.delete(res);
	});
}

// Parser functions
async function parseBacklog(filePath) {
	const columns = {};
	const statuses = ['READY', 'IN_PROGRESS', 'DONE', 'QA_TESTING', 'QA_PASSED', 'QA_FAILED', 'REVIEWING', 'REVIEWED', 'SHIPPED'];
	statuses.forEach(s => columns[s] = []);

	if (!existsSync(filePath)) return { columns };

	const content = await readFile(filePath, 'utf-8');
	const lines = content.split('\n');
	let currentTask = null;

	for (const line of lines) {
		const headerMatch = line.match(/^## (READY|IN_PROGRESS|DONE|QA_TESTING|QA_PASSED|QA_FAILED|REVIEWING|REVIEWED|SHIPPED):\s*(?:\[P(\d)\])?\s*(.+?)(?:\s+@(\S+))?$/);

		if (headerMatch) {
			if (currentTask && currentTask.status && currentTask.title) {
				columns[currentTask.status].push(currentTask);
			}
			const [, status, priority, title, assignee] = headerMatch;
			currentTask = {
				id: `${status}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				status,
				priority: priority ? parseInt(priority) : 2,
				title: title.trim(),
				assignee: assignee || 'unassigned'
			};
			continue;
		}

		if (currentTask) {
			const filesMatch = line.match(/^\*\*Files:\*\*\s*(.+)$/);
			if (filesMatch) currentTask.files = filesMatch[1].split(',').map(f => f.trim());

			const summaryMatch = line.match(/^\*\*Summary:\*\*\s*(.+)$/);
			if (summaryMatch) currentTask.summary = summaryMatch[1];
		}
	}

	if (currentTask && currentTask.status && currentTask.title) {
		columns[currentTask.status].push(currentTask);
	}

	return { columns };
}

async function parseStandup(filePath) {
	const agents = [];
	const agentNames = ['product-owner', 'tech-lead', 'dev-alpha', 'dev-beta', 'dev-gamma', 'qa', 'reviewer', 'devops'];

	if (!existsSync(filePath)) {
		return agentNames.map(name => ({ name, status: 'Idle', workingOn: '--', completed: '--', blockers: 'None', next: '--', updated: '--' }));
	}

	const content = await readFile(filePath, 'utf-8');

	for (const name of agentNames) {
		const sectionRegex = new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
		const match = content.match(sectionRegex);

		if (match) {
			const section = match[1];
			const statusMatch = section.match(/\*\*Status:\*\*\s*(.+)/);
			const workingMatch = section.match(/\*\*Working on:\*\*\s*(.+)/);
			const completedMatch = section.match(/\*\*Completed:\*\*\s*(.+)/);
			const blockersMatch = section.match(/\*\*Blockers:\*\*\s*(.+)/);
			const nextMatch = section.match(/\*\*Next:\*\*\s*(.+)/);
			const updatedMatch = section.match(/\*Updated:\s*(.+?)\*/);

			const rawStatus = statusMatch?.[1] || 'Idle';
			let status = 'Idle';
			if (rawStatus.toUpperCase().includes('BLOCKED')) status = 'Blocked';
			else if (rawStatus !== 'Idle' && rawStatus !== '--') status = 'Working';

			agents.push({
				name,
				status,
				workingOn: workingMatch?.[1] || '--',
				completed: completedMatch?.[1] || '--',
				blockers: blockersMatch?.[1] || 'None',
				next: nextMatch?.[1] || '--',
				updated: updatedMatch?.[1] || '--'
			});
		} else {
			agents.push({ name, status: 'Idle', workingOn: '--', completed: '--', blockers: 'None', next: '--', updated: '--' });
		}
	}

	return agents;
}

async function parseHandoffs(dirPath) {
	const handoffs = [];
	if (!existsSync(dirPath)) return handoffs;

	const files = await readdir(dirPath);

	for (const file of files) {
		if (!file.endsWith('.md') || file === '.gitkeep') continue;

		try {
			const content = await readFile(path.join(dirPath, file), 'utf-8');
			const titleMatch = content.match(/^# (.+)/m);
			const filenameMatch = file.match(/^(\w+)-to-([\w-]+)/);

			let from = 'unknown', to = 'unknown';
			if (filenameMatch) {
				from = filenameMatch[1] === 'tl' ? 'tech-lead' : filenameMatch[1];
				to = filenameMatch[2];
			}

			handoffs.push({
				id: file.replace('.md', ''),
				filename: file,
				title: titleMatch?.[1] || file.replace('.md', ''),
				from,
				to,
				date: ''
			});
		} catch (e) {
			console.error(`Error parsing ${file}:`, e);
		}
	}

	return handoffs;
}

// State
let currentState = { backlog: { columns: {} }, agents: [], handoffs: [] };

async function parseAll() {
	try {
		const [backlog, agents, handoffs] = await Promise.all([
			parseBacklog(path.join(DATA_DIR, 'backlog.md')),
			parseStandup(path.join(DATA_DIR, 'standup.md')),
			parseHandoffs(path.join(DATA_DIR, 'handoffs'))
		]);
		currentState = { backlog, agents, handoffs };
	} catch (e) {
		console.error('[Server] Parse error:', e);
	}
}

// Create HTTP server with API routing
const server = createServer((req, res) => {
	const url = new URL(req.url, `http://${req.headers.host}`);

	// API Routes for real-time events
	if (url.pathname === '/api/events' && req.method === 'POST') {
		return handleEventPost(req, res);
	}

	if (url.pathname === '/api/events/stream' && req.method === 'GET') {
		return handleSSEStream(req, res);
	}

	// Trigger a manual refresh (useful for testing)
	if (url.pathname === '/api/refresh' && req.method === 'POST') {
		parseAll().then(() => {
			broadcast(currentState);
			broadcastSSE({ type: 'refresh', data: currentState, timestamp: Date.now() });
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ ok: true }));
		});
		return;
	}

	// SvelteKit handler for everything else
	handler(req, res, () => {
		res.writeHead(404).end('Not Found');
	});
});

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
	console.log('[WS] Client connected');

	// Send initial state
	ws.send(JSON.stringify({ type: 'initial', data: currentState, timestamp: Date.now() }));

	ws.on('close', () => console.log('[WS] Client disconnected'));
	ws.on('error', (err) => console.error('[WS] Error:', err));
});

function broadcast(data) {
	const message = JSON.stringify({ type: 'update', data, timestamp: Date.now() });
	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}

// File watcher
const watchPaths = [
	path.join(DATA_DIR, 'backlog.md'),
	path.join(DATA_DIR, 'standup.md'),
	path.join(DATA_DIR, 'handoffs')
];

let debounceTimer = null;

chokidar.watch(watchPaths, {
	persistent: true,
	ignoreInitial: true,
	awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
}).on('all', (event, filePath) => {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		console.log(`[Watcher] ${event}: ${path.basename(filePath)}`);
		await parseAll();
		// Broadcast via both WebSocket and SSE
		broadcast(currentState);
		broadcastSSE({ type: 'file_change', data: currentState, timestamp: Date.now() });
	}, 200);
});

// Start
parseAll().then(() => {
	server.listen(PORT, () => {
		console.log(`\n🏢 Agency Dashboard running at http://localhost:${PORT}`);
		console.log(`📁 Watching: ${DATA_DIR}\n`);
	});
});
