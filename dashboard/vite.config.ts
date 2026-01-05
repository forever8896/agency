import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * Vite Configuration
 *
 * Simple setup - no file watching plugins needed
 * Dashboard uses event-driven architecture:
 * - Agency POSTs events to /api/events
 * - SSE broadcasts to clients
 * - No file watching complexity
 */
export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 3000
	}
});
