// Agency v3 - Agent API Routes

import { Router } from 'express';
import { agentQueries, sessionQueries, messageQueries, eventQueries } from '../../db/database.js';
import { getAgentManager } from '../../agents/agent-manager.js';
import type { AgentStatus } from '../../types/index.js';

export const agentRoutes = Router();

// ============================================================================
// Static Routes (MUST come before /:name wildcard routes)
// ============================================================================

// List all agents
agentRoutes.get('/', (_req, res) => {
  try {
    const agents = agentQueries.getAll();
    res.json({ agents });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get running agents status
agentRoutes.get('/running', (_req, res) => {
  try {
    const manager = getAgentManager();
    const running = manager.getRunningAgents();
    res.json({ running });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// Orchestration Control (MUST come before /:name wildcard routes)
// ============================================================================

// Get orchestration status
agentRoutes.get('/orchestration/status', (_req, res) => {
  try {
    const manager = getAgentManager();
    const status = manager.getOrchestrationStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Enable auto-orchestration
agentRoutes.post('/orchestration/enable', (req, res) => {
  try {
    const { intervalMs } = req.body;
    const manager = getAgentManager();
    manager.enableAutoOrchestration(intervalMs);

    res.json({
      success: true,
      message: 'Auto-orchestration enabled',
      ...manager.getOrchestrationStatus(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Disable auto-orchestration
agentRoutes.post('/orchestration/disable', (_req, res) => {
  try {
    const manager = getAgentManager();
    manager.disableAutoOrchestration();

    res.json({
      success: true,
      message: 'Auto-orchestration disabled',
      ...manager.getOrchestrationStatus(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Trigger manual orchestration cycle
agentRoutes.post('/orchestration/run', async (_req, res) => {
  try {
    const manager = getAgentManager();
    await manager.runOrchestration();

    res.json({
      success: true,
      message: 'Orchestration cycle completed',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// Agent-specific routes (wildcard /:name routes)
// ============================================================================

// Get single agent
agentRoutes.get('/:name', (req, res) => {
  try {
    const agent = agentQueries.getByName(req.params.name);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get agent's sessions
agentRoutes.get('/:name/sessions', (req, res) => {
  try {
    const sessions = sessionQueries.getByAgent(req.params.name);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get agent's conversation history
agentRoutes.get('/:name/history', (req, res) => {
  try {
    const agent = agentQueries.getByName(req.params.name);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    if (!agent.session_id) {
      res.json({ messages: [] });
      return;
    }

    const messages = messageQueries.getBySession(agent.session_id);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update agent status
agentRoutes.patch('/:name', (req, res) => {
  try {
    const { status, working_on, blocker } = req.body;

    const agent = agentQueries.updateStatus(
      req.params.name,
      status as AgentStatus,
      working_on,
      blocker
    );

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Agent heartbeat
agentRoutes.post('/:name/heartbeat', (req, res) => {
  try {
    const { status, working_on } = req.body;

    // Update status if provided
    if (status) {
      agentQueries.updateStatus(req.params.name, status, working_on);
    }

    // Record heartbeat
    const agent = agentQueries.heartbeat(req.params.name);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    eventQueries.create('agent.heartbeat', {
      agentName: agent.name,
      data: { status: agent.status, working_on },
    });

    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// Agent Control - Uses AgentManager for real process management
// ============================================================================

// Start agent
agentRoutes.post('/:name/start', async (req, res) => {
  try {
    const { taskId } = req.body;
    const agentName = req.params.name;

    const manager = getAgentManager();
    await manager.startAgent(agentName, taskId);

    const controller = manager.getController(agentName);

    res.json({
      success: true,
      message: `Agent ${agentName} started`,
      pid: controller?.getPid() || null,
      sessionId: controller?.getSessionId() || null,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stop agent
agentRoutes.post('/:name/stop', async (req, res) => {
  try {
    const agentName = req.params.name;

    const manager = getAgentManager();
    await manager.stopAgent(agentName);

    res.json({ success: true, message: `Agent ${agentName} stopped` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Pause agent
agentRoutes.post('/:name/pause', async (req, res) => {
  try {
    const { reason } = req.body;
    const agentName = req.params.name;

    const manager = getAgentManager();
    await manager.pauseAgent(agentName, reason);

    res.json({ success: true, message: `Agent ${agentName} paused` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Resume agent
agentRoutes.post('/:name/resume', async (req, res) => {
  try {
    const agentName = req.params.name;

    const manager = getAgentManager();
    await manager.resumeAgent(agentName);

    res.json({ success: true, message: `Agent ${agentName} resumed` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Inject message
agentRoutes.post('/:name/inject', async (req, res) => {
  try {
    const { message, injected_by } = req.body;
    const agentName = req.params.name;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const manager = getAgentManager();
    await manager.injectMessage(agentName, message, injected_by || 'user');

    res.json({
      success: true,
      message: 'Message injected',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Redirect agent to new task
agentRoutes.post('/:name/redirect', async (req, res) => {
  try {
    const { taskId } = req.body;
    const agentName = req.params.name;

    if (!taskId) {
      res.status(400).json({ error: 'Task ID is required' });
      return;
    }

    const manager = getAgentManager();
    await manager.redirectAgent(agentName, taskId);

    res.json({
      success: true,
      message: `Agent ${agentName} redirected to task ${taskId}`,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
