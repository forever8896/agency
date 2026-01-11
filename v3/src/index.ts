// Agency v3 - Main Server Entry Point

import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, closeDatabase, eventQueries } from './db/database.js';
import { initializeAgentManager, shutdownAgentManager, getAgentManager } from './agents/agent-manager.js';
import { taskRoutes } from './api/routes/tasks.js';
import { agentRoutes } from './api/routes/agents.js';
import { eventRoutes, broadcastEvent } from './api/routes/events.js';
import { dashboardRoutes } from './api/routes/dashboard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

// Determine paths
// AGENCY_DIR: v3/ directory (one level up from dist/) - contains agents/ with AGENT.md files
// DATA_DIR: v3/data/ - contains SQLite database
// PROJECTS_DIR: Root of workspace where agents do their work
const AGENCY_DIR = process.env.AGENCY_DIR || resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || resolve(__dirname, '../data');
const PROJECTS_DIR = process.env.PROJECTS_DIR || resolve(__dirname, '../../..');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API routes
app.use('/api/tasks', taskRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function main() {
  console.log('Agency v3 Server');
  console.log('================\n');

  // Initialize database
  console.log('Initializing database...');
  initializeDatabase();
  console.log('Database ready\n');

  // Initialize agent manager
  console.log('Initializing agent manager...');
  console.log(`  Agency Dir:   ${AGENCY_DIR}`);
  console.log(`  Data Dir:     ${DATA_DIR}`);
  console.log(`  Projects Dir: ${PROJECTS_DIR}`);
  initializeAgentManager({
    agencyDir: AGENCY_DIR,
    dataDir: DATA_DIR,
    projectsDir: PROJECTS_DIR,
  });

  // Wire agent events to SSE broadcast
  const agentManager = getAgentManager();

  agentManager.on('agent:output', (agentName, chunk, events) => {
    // Debug: log when we receive output
    if (events.length > 0) {
      console.log(`[${agentName}] output: ${events.length} events, types: ${events.map((e: {type: string}) => e.type).join(', ')}`);
    }
    // Stream raw output chunks to frontend
    broadcastEvent({
      type: 'agent:output',
      data: { agent: agentName, chunk, events },
    });
  });

  agentManager.on('agent:state', (agentName, from, to) => {
    broadcastEvent({
      type: 'agent:state',
      data: { agent: agentName, from, to },
    });
  });

  console.log('Agent manager ready\n');

  // Log startup event
  eventQueries.create('system.startup', {
    message: 'Agency v3 server started',
    data: { port: PORT, host: HOST },
  });

  // Start server
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log('\nEndpoints:');
    console.log(`  GET  /health            - Health check`);
    console.log(`  GET  /api/tasks         - List tasks`);
    console.log(`  POST /api/tasks         - Create task`);
    console.log(`  GET  /api/agents        - List agents`);
    console.log(`  GET  /api/agents/running - Get running agents`);
    console.log(`  POST /api/agents/:name/start  - Start agent`);
    console.log(`  POST /api/agents/:name/stop   - Stop agent`);
    console.log(`  POST /api/agents/:name/pause  - Pause agent`);
    console.log(`  POST /api/agents/:name/resume - Resume agent`);
    console.log(`  POST /api/agents/:name/inject - Inject message`);
    console.log(`  GET  /api/events/stream - SSE stream`);
    console.log(`  GET  /api/dashboard/summary - Dashboard summary`);
  });

  // Graceful shutdown
  async function shutdown(signal: string) {
    console.log(`\nReceived ${signal}, shutting down...`);

    // Stop all agents first
    console.log('Stopping all agents...');
    await shutdownAgentManager();

    // Close server
    server.close(() => {
      eventQueries.create('system.shutdown', { message: 'Server shutdown' });
      closeDatabase();
      console.log('Server closed');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
