import chokidar from 'chokidar';
import path from 'path';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { createHash } from 'crypto';
import { parseBacklog, parseStandup, parseHandoffs } from './parser';
import type { DashboardState } from '../types';

// Get data directory from environment or use default
const DATA_DIR = process.env.AGENCY_DATA_DIR || path.resolve(process.cwd(), '../agency/data');
const AGENCY_DIR = path.resolve(process.cwd(), '..');

// Initialize data directory from templates if it doesn't exist
// Mirrors the init_data() function in agency.sh
function initDataDir() {
	if (!existsSync(DATA_DIR)) {
		console.log(`[FileWatcher] Creating data directory: ${DATA_DIR}`);
		mkdirSync(DATA_DIR, { recursive: true });
		mkdirSync(path.join(DATA_DIR, 'handoffs'), { recursive: true });
	}

	// Copy templates if runtime files don't exist
	const templates = ['inbox.md', 'backlog.md', 'board.md', 'standup.md', 'metrics.md'];
	for (const file of templates) {
		const dataFile = path.join(DATA_DIR, file);
		const templateFile = path.join(AGENCY_DIR, file);

		if (!existsSync(dataFile) && existsSync(templateFile)) {
			console.log(`[FileWatcher] Initializing ${file} from template`);
			copyFileSync(templateFile, dataFile);
		}
	}
}

// Initialize on module load (before watcher starts)
initDataDir();

type ChangeCallback = (state: DashboardState, hash: string) => void;

// Compute content hash for change detection
function computeHash(state: DashboardState): string {
	return createHash('md5').update(JSON.stringify(state)).digest('hex').slice(0, 8);
}

class FileWatcher {
	private watcher: chokidar.FSWatcher | null = null;
	private callbacks: Set<ChangeCallback> = new Set();
	private currentState: DashboardState = {
		backlog: { columns: {} },
		agents: [],
		handoffs: []
	};
	private currentHash: string = '';
	private debounceTimer: NodeJS.Timeout | null = null;
	private isReady: boolean = false;

	async start() {
		console.log(`[FileWatcher] Watching: ${DATA_DIR}`);

		const watchPaths = [
			path.join(DATA_DIR, 'backlog.md'),
			path.join(DATA_DIR, 'standup.md'),
			path.join(DATA_DIR, 'handoffs')
		];

		// Initial parse
		await this.parseAll();
		this.isReady = true;

		this.watcher = chokidar.watch(watchPaths, {
			persistent: true,
			ignoreInitial: true,
			// Longer stabilization to avoid rapid-fire events
			awaitWriteFinish: {
				stabilityThreshold: 500,
				pollInterval: 100
			}
		});

		this.watcher
			.on('add', (filePath) => this.handleChange(filePath))
			.on('change', (filePath) => this.handleChange(filePath))
			.on('unlink', (filePath) => this.handleChange(filePath));

		console.log('[FileWatcher] Started');
	}

	private async parseAll(): Promise<boolean> {
		try {
			const [backlog, agents, handoffs] = await Promise.all([
				parseBacklog(path.join(DATA_DIR, 'backlog.md')),
				parseStandup(path.join(DATA_DIR, 'standup.md')),
				parseHandoffs(path.join(DATA_DIR, 'handoffs'))
			]);

			const newState = { backlog, agents, handoffs };
			const newHash = computeHash(newState);

			// Only update if content actually changed
			if (newHash !== this.currentHash) {
				this.currentState = newState;
				this.currentHash = newHash;
				return true; // Changed
			}
			return false; // No change
		} catch (e) {
			console.error('[FileWatcher] Parse error:', e);
			return false;
		}
	}

	private handleChange(filePath: string) {
		// Debounce rapid changes with longer delay
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(async () => {
			const changed = await this.parseAll();
			if (changed) {
				console.log(`[FileWatcher] Change detected: ${path.basename(filePath)} (hash: ${this.currentHash})`);
				this.notifySubscribers();
			}
		}, 300); // Longer debounce
	}

	private notifySubscribers() {
		for (const callback of this.callbacks) {
			try {
				callback(this.currentState, this.currentHash);
			} catch (e) {
				console.error('[FileWatcher] Callback error:', e);
			}
		}
	}

	// Subscribe to FUTURE changes only - does NOT send current state
	// Use getState() + getHash() for initial state
	subscribe(callback: ChangeCallback): () => void {
		this.callbacks.add(callback);
		return () => this.callbacks.delete(callback);
	}

	getState(): DashboardState {
		return this.currentState;
	}

	getHash(): string {
		return this.currentHash;
	}

	isInitialized(): boolean {
		return this.isReady;
	}

	stop() {
		this.watcher?.close();
		console.log('[FileWatcher] Stopped');
	}
}

// Singleton instance
export const fileWatcher = new FileWatcher();
