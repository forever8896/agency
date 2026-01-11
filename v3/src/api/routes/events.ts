// Agency v3 - Events API Routes (SSE Stream)

import { Router, Request, Response } from 'express';
import { eventQueries, taskQueries, agentQueries, handoffQueries } from '../../db/database.js';
import type { SSEEvent, DashboardState, EventType } from '../../types/index.js';

export const eventRoutes = Router();

// Store connected SSE clients
const clients: Set<Response> = new Set();

// Helper to send SSE event to all clients
export function broadcastEvent(event: SSEEvent): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}

// Helper to get current dashboard state
function getDashboardState(): DashboardState {
  const tasks = taskQueries.list({ limit: 100 });
  const agents = agentQueries.getAll();
  const handoffs = handoffQueries.list({ limit: 50 });
  const recentEvents = eventQueries.list({ limit: 20 });

  return { tasks, agents, handoffs, recentEvents };
}

// SSE stream endpoint
eventRoutes.get('/stream', (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Add client to set
  clients.add(res);
  console.log(`SSE client connected. Total clients: ${clients.size}`);

  // Send initial connection event
  const connectEvent: SSEEvent = { type: 'connected', timestamp: Date.now() };
  res.write(`data: ${JSON.stringify(connectEvent)}\n\n`);

  // Send initial state
  const state = getDashboardState();
  const stateEvent: SSEEvent = { type: 'state', data: state };
  res.write(`data: ${JSON.stringify(stateEvent)}\n\n`);

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    const heartbeat: SSEEvent = { type: 'heartbeat', timestamp: Date.now() };
    res.write(`data: ${JSON.stringify(heartbeat)}\n\n`);
  }, 30000);

  // Poll for new events (simple approach - can be improved with triggers)
  let lastEventId = 0;
  const pollInterval = setInterval(() => {
    const events = eventQueries.list({ limit: 10, since: lastEventId > 0 ? Date.now() - 5000 : undefined });
    for (const event of events.reverse()) {
      if (event.id > lastEventId) {
        lastEventId = event.id;
        const sseEvent: SSEEvent = { type: 'event', data: event };
        res.write(`data: ${JSON.stringify(sseEvent)}\n\n`);
      }
    }
  }, 2000);

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(res);
    clearInterval(heartbeatInterval);
    clearInterval(pollInterval);
    console.log(`SSE client disconnected. Total clients: ${clients.size}`);
  });
});

// List recent events
eventRoutes.get('/', (req, res) => {
  try {
    const { type, limit, since } = req.query;

    const events = eventQueries.list({
      type: type as EventType | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      since: since ? parseInt(since as string, 10) : undefined,
    });

    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Post event (for external sources like bash scripts)
eventRoutes.post('/', (req, res) => {
  try {
    const { type, agent_name, task_id, session_id, handoff_id, data, message } = req.body;

    if (!type) {
      res.status(400).json({ error: 'Event type is required' });
      return;
    }

    const event = eventQueries.create(type as EventType, {
      agentName: agent_name,
      taskId: task_id,
      sessionId: session_id,
      handoffId: handoff_id,
      data,
      message,
    });

    // Broadcast to SSE clients
    broadcastEvent({ type: 'event', data: event });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Force refresh (trigger all clients to reload state)
eventRoutes.post('/refresh', (_req, res) => {
  try {
    const state = getDashboardState();
    broadcastEvent({ type: 'state', data: state });
    res.json({ success: true, clients: clients.size });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
