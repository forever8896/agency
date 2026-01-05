import chokidar from 'chokidar';
import path from 'path';
import { parseBacklog, parseStandup, parseHandoffs } from './parser';
import type { DashboardState } from '../types';

// Get data directory from environment or use default
const DATA_DIR = process.env.AGENCY_DATA_DIR || path.resolve(process.cwd(), '../agency/data');

type ChangeCallback = (state: DashboardState) => void;

class FileWatcher {
	private watcher: chokidar.FSWatcher | null = null;
	private callbacks: Set<ChangeCallback> = new Set();
	private currentState: DashboardState = {
		backlog: { columns: {} },
		agents: [],
		handoffs: []
	};
	private debounceTimer: NodeJS.Timeout | null = null;

	async start() {
		console.log(`[FileWatcher] Watching: ${DATA_DIR}`);

		const watchPaths = [
			path.join(DATA_DIR, 'backlog.md'),
			path.join(DATA_DIR, 'standup.md'),
			path.join(DATA_DIR, 'handoffs')
		];

		// Initial parse
		await this.parseAll();

		this.watcher = chokidar.watch(watchPaths, {
			persistent: true,
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: 300,
				pollInterval: 100
			}
		});

		this.watcher
			.on('add', (filePath) => this.handleChange(filePath))
			.on('change', (filePath) => this.handleChange(filePath))
			.on('unlink', (filePath) => this.handleChange(filePath));

		console.log('[FileWatcher] Started');
	}

	private async parseAll() {
		try {
			const [backlog, agents, handoffs] = await Promise.all([
				parseBacklog(path.join(DATA_DIR, 'backlog.md')),
				parseStandup(path.join(DATA_DIR, 'standup.md')),
				parseHandoffs(path.join(DATA_DIR, 'handoffs'))
			]);

			this.currentState = { backlog, agents, handoffs };
		} catch (e) {
			console.error('[FileWatcher] Parse error:', e);
		}
	}

	private handleChange(filePath: string) {
		// Debounce rapid changes
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(async () => {
			console.log(`[FileWatcher] Change detected: ${path.basename(filePath)}`);
			await this.parseAll();
			this.notifySubscribers();
		}, 200);
	}

	private notifySubscribers() {
		for (const callback of this.callbacks) {
			try {
				callback(this.currentState);
			} catch (e) {
				console.error('[FileWatcher] Callback error:', e);
			}
		}
	}

	subscribe(callback: ChangeCallback): () => void {
		this.callbacks.add(callback);
		// Immediately send current state
		callback(this.currentState);
		return () => this.callbacks.delete(callback);
	}

	getState(): DashboardState {
		return this.currentState;
	}

	stop() {
		this.watcher?.close();
		console.log('[FileWatcher] Stopped');
	}
}

// Singleton instance
export const fileWatcher = new FileWatcher();
