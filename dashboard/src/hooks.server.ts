// Server hooks
// No file watching - dashboard uses event-driven architecture
// Events come from agency via POST /api/events

import { building } from '$app/environment';

if (!building) {
	console.log('[Hooks] Dashboard server ready (event-driven mode)');
}
