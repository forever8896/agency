import path from 'path';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { parseBacklog, parseStandup, parseHandoffs } from './parser';
import type { DashboardState } from '../types';

// Get data directory from environment or use default
const DATA_DIR = process.env.AGENCY_DATA_DIR || path.resolve(process.cwd(), '../agency/data');
const AGENCY_DIR = path.resolve(process.cwd(), '..');

// Initialize data directory from templates if it doesn't exist
function initDataDir() {
	if (!existsSync(DATA_DIR)) {
		console.log(`[DataLoader] Creating data directory: ${DATA_DIR}`);
		mkdirSync(DATA_DIR, { recursive: true });
		mkdirSync(path.join(DATA_DIR, 'handoffs'), { recursive: true });
	}

	const templates = ['inbox.md', 'backlog.md', 'board.md', 'standup.md', 'metrics.md'];
	for (const file of templates) {
		const dataFile = path.join(DATA_DIR, file);
		const templateFile = path.join(AGENCY_DIR, file);

		if (!existsSync(dataFile) && existsSync(templateFile)) {
			console.log(`[DataLoader] Initializing ${file} from template`);
			copyFileSync(templateFile, dataFile);
		}
	}
}

// Initialize once on module load
initDataDir();

/**
 * Simple data loader - reads files on-demand only
 * No file watching, no subscriptions, no complexity
 */
class DataLoader {
	private cachedState: DashboardState | null = null;
	private cacheTime: number = 0;
	private readonly CACHE_TTL = 1000; // 1 second cache to prevent hammering disk

	/**
	 * Load current state from markdown files
	 * Uses short-lived cache to prevent excessive disk reads
	 */
	async load(): Promise<DashboardState> {
		const now = Date.now();

		// Return cached if fresh enough
		if (this.cachedState && (now - this.cacheTime) < this.CACHE_TTL) {
			return this.cachedState;
		}

		try {
			const [backlog, agents, handoffs] = await Promise.all([
				parseBacklog(path.join(DATA_DIR, 'backlog.md')),
				parseStandup(path.join(DATA_DIR, 'standup.md')),
				parseHandoffs(path.join(DATA_DIR, 'handoffs'))
			]);

			this.cachedState = { backlog, agents, handoffs };
			this.cacheTime = now;

			return this.cachedState;
		} catch (e) {
			console.error('[DataLoader] Parse error:', e);
			// Return empty state on error
			return {
				backlog: { columns: {} },
				agents: [],
				handoffs: []
			};
		}
	}

	/**
	 * Invalidate cache - call after receiving an event that files changed
	 */
	invalidate() {
		this.cachedState = null;
		this.cacheTime = 0;
	}

	/**
	 * Get data directory path
	 */
	getDataDir(): string {
		return DATA_DIR;
	}
}

// Singleton instance
export const dataLoader = new DataLoader();
