// Agency v3 - Dashboard API Routes

import { Router } from 'express';
import { taskQueries, agentQueries, handoffQueries, eventQueries, getDatabase } from '../../db/database.js';
import type { DashboardSummary } from '../../types/index.js';

export const dashboardRoutes = Router();

// Dashboard summary
dashboardRoutes.get('/summary', (_req, res) => {
  try {
    const db = getDatabase();

    // Get task counts by status
    const taskCounts = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'INBOX' THEN 1 ELSE 0 END) as inbox,
        SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'QA_TESTING' THEN 1 ELSE 0 END) as qa_testing,
        SUM(CASE WHEN status = 'SHIPPED' AND shipped_at > ? THEN 1 ELSE 0 END) as shipped_today
      FROM tasks
    `).get(Date.now() - 24 * 60 * 60 * 1000) as Record<string, number>;

    // Get agent counts by status
    const agentCounts = db.prepare(`
      SELECT
        SUM(CASE WHEN status != 'OFFLINE' THEN 1 ELSE 0 END) as online,
        SUM(CASE WHEN status = 'WORKING' THEN 1 ELSE 0 END) as working,
        SUM(CASE WHEN status = 'IDLE' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) as blocked
      FROM agents
    `).get() as Record<string, number>;

    const summary: DashboardSummary = {
      tasks: {
        inbox: taskCounts.inbox || 0,
        ready: taskCounts.ready || 0,
        in_progress: taskCounts.in_progress || 0,
        done: taskCounts.done || 0,
        qa_testing: taskCounts.qa_testing || 0,
        shipped_today: taskCounts.shipped_today || 0,
      },
      agents: {
        online: agentCounts.online || 0,
        working: agentCounts.working || 0,
        idle: agentCounts.idle || 0,
        blocked: agentCounts.blocked || 0,
      },
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Kanban board data
dashboardRoutes.get('/board', (_req, res) => {
  try {
    const tasks = taskQueries.list({ limit: 200 });

    // Group by status
    const columns: Record<string, typeof tasks> = {
      INBOX: [],
      READY: [],
      IN_PROGRESS: [],
      DONE: [],
      QA_TESTING: [],
      QA_PASSED: [],
      SHIPPED: [],
    };

    for (const task of tasks) {
      if (columns[task.status]) {
        columns[task.status].push(task);
      }
    }

    res.json({ columns });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Full state for initial load
dashboardRoutes.get('/state', (_req, res) => {
  try {
    const tasks = taskQueries.list({ limit: 200 });
    const agents = agentQueries.getAll();
    const handoffs = handoffQueries.list({ limit: 50 });
    const recentEvents = eventQueries.list({ limit: 30 });

    res.json({
      tasks,
      agents,
      handoffs,
      recentEvents,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Agent workload view
dashboardRoutes.get('/workload', (_req, res) => {
  try {
    const db = getDatabase();

    const workload = db.prepare(`
      SELECT
        a.name,
        a.type,
        a.status,
        a.working_on,
        a.last_heartbeat,
        COUNT(t.id) as active_tasks,
        (
          SELECT COUNT(*)
          FROM tasks t2
          WHERE t2.assigned_to = a.name AND t2.status = 'SHIPPED'
        ) as completed_tasks
      FROM agents a
      LEFT JOIN tasks t ON a.name = t.assigned_to AND t.status = 'IN_PROGRESS'
      GROUP BY a.name
      ORDER BY a.type, a.name
    `).all();

    res.json({ workload });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Activity feed
dashboardRoutes.get('/activity', (req, res) => {
  try {
    const { limit } = req.query;
    const events = eventQueries.list({
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Handoffs overview
dashboardRoutes.get('/handoffs', (_req, res) => {
  try {
    const pending = handoffQueries.list({ status: 'PENDING', limit: 20 });
    const claimed = handoffQueries.list({ status: 'CLAIMED', limit: 10 });
    const recent = handoffQueries.list({ limit: 10 });

    res.json({
      pending,
      claimed,
      recent,
      counts: {
        pending: pending.length,
        claimed: claimed.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
