import { building } from '$app/environment';
import { fileWatcher } from '$lib/server/file-watcher';

// Start file watcher when server starts (not during build)
if (!building) {
	fileWatcher.start().catch(console.error);
	console.log('[Hooks] File watcher started');
}
