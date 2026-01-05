import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Inline parser for dev mode
async function parseBacklog(filePath: string) {
	const columns: Record<string, any[]> = {};
	const statuses = ['READY', 'IN_PROGRESS', 'DONE', 'QA_TESTING', 'QA_PASSED', 'QA_FAILED', 'REVIEWING', 'REVIEWED', 'SHIPPED'];
	statuses.forEach(s => columns[s] = []);

	if (!existsSync(filePath)) return { columns };

	const content = await readFile(filePath, 'utf-8');
	const lines = content.split('\n');
	let currentTask: any = null;

	for (const line of lines) {
		const headerMatch = line.match(/^## (READY|IN_PROGRESS|DONE|QA_TESTING|QA_PASSED|QA_FAILED|REVIEWING|REVIEWED|SHIPPED):\s*(?:\[P(\d)\])?\s*(.+?)(?:\s+@(\S+))?$/);

		if (headerMatch) {
			if (currentTask?.status && currentTask?.title) {
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
			if (filesMatch) currentTask.files = filesMatch[1].split(',').map((f: string) => f.trim());

			const summaryMatch = line.match(/^\*\*Summary:\*\*\s*(.+)$/);
			if (summaryMatch) currentTask.summary = summaryMatch[1];
		}
	}

	if (currentTask?.status && currentTask?.title) {
		columns[currentTask.status].push(currentTask);
	}

	return { columns };
}

async function parseStandup(filePath: string) {
	const agents: any[] = [];
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

			agents.push({ name, status, workingOn: workingMatch?.[1] || '--', completed: completedMatch?.[1] || '--', blockers: blockersMatch?.[1] || 'None', next: nextMatch?.[1] || '--', updated: updatedMatch?.[1] || '--' });
		} else {
			agents.push({ name, status: 'Idle', workingOn: '--', completed: '--', blockers: 'None', next: '--', updated: '--' });
		}
	}

	return agents;
}

async function parseHandoffs(dirPath: string) {
	const handoffs: any[] = [];
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

			handoffs.push({ id: file.replace('.md', ''), filename: file, title: titleMatch?.[1] || file.replace('.md', ''), from, to, date: '' });
		} catch (e) { /* skip */ }
	}

	return handoffs;
}

// WebSocket plugin for dev mode
function webSocketPlugin() {
	let wss: WebSocketServer | null = null;
	let currentState = { backlog: { columns: {} }, agents: [] as any[], handoffs: [] as any[] };
	const DATA_DIR = path.resolve(process.cwd(), '../agency/data');

	async function parseAll() {
		const [backlog, agents, handoffs] = await Promise.all([
			parseBacklog(path.join(DATA_DIR, 'backlog.md')),
			parseStandup(path.join(DATA_DIR, 'standup.md')),
			parseHandoffs(path.join(DATA_DIR, 'handoffs'))
		]);
		currentState = { backlog, agents, handoffs };
	}

	function broadcast() {
		if (!wss) return;
		const message = JSON.stringify({ type: 'update', data: currentState, timestamp: Date.now() });
		wss.clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) client.send(message);
		});
	}

	return {
		name: 'websocket-plugin',
		configureServer(server: any) {
			wss = new WebSocketServer({ server: server.httpServer, path: '/ws' });

			wss.on('connection', (ws) => {
				console.log('[Dev WS] Client connected');
				ws.send(JSON.stringify({ type: 'initial', data: currentState, timestamp: Date.now() }));
				ws.on('close', () => console.log('[Dev WS] Client disconnected'));
			});

			// File watcher
			let debounce: NodeJS.Timeout | null = null;
			chokidar.watch([
				path.join(DATA_DIR, 'backlog.md'),
				path.join(DATA_DIR, 'standup.md'),
				path.join(DATA_DIR, 'handoffs')
			], { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 300 } })
			.on('all', () => {
				if (debounce) clearTimeout(debounce);
				debounce = setTimeout(async () => {
					await parseAll();
					broadcast();
				}, 200);
			});

			// Initial parse
			parseAll().then(() => console.log(`[Dev WS] Watching ${DATA_DIR}`));
		}
	};
}

export default defineConfig({
	plugins: [sveltekit(), webSocketPlugin()],
	server: {
		port: 3000
	}
});
