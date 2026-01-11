// Agency v3 - Task API Routes

import { Router } from 'express';
import { taskQueries, eventQueries } from '../../db/database.js';
import type { TaskStatus, CreateTaskInput, UpdateTaskInput } from '../../types/index.js';

export const taskRoutes = Router();

// List tasks with optional filtering
taskRoutes.get('/', (req, res) => {
  try {
    const { status, assignedTo, limit, offset } = req.query;

    const tasks = taskQueries.list({
      status: status ? (status as string).split(',') as TaskStatus[] : undefined,
      assignedTo: assignedTo as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      tasks,
      total: tasks.length,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get single task
taskRoutes.get('/:id', (req, res) => {
  try {
    const task = taskQueries.getById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create new task
taskRoutes.post('/', (req, res) => {
  try {
    const input: CreateTaskInput = {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status, // Optional: defaults to INBOX
      priority: req.body.priority,
      size: req.body.size,
      value_statement: req.body.value_statement,
      acceptance_criteria: req.body.acceptance_criteria,
      context: req.body.context,
      review_required: req.body.review_required,
    };

    if (!input.title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const task = taskQueries.create(input);

    // Log event
    eventQueries.create('task.created', {
      taskId: task.id,
      message: `Task created: ${task.title}`,
      data: { priority: task.priority },
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update task
taskRoutes.patch('/:id', (req, res) => {
  try {
    const task = taskQueries.update(req.params.id, req.body as UpdateTaskInput);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    eventQueries.create('task.updated', {
      taskId: task.id,
      message: `Task updated: ${task.title}`,
      data: { changes: Object.keys(req.body) },
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete task
taskRoutes.delete('/:id', (req, res) => {
  try {
    const deleted = taskQueries.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// Workflow Transitions
// ============================================================================

// Claim task (READY -> IN_PROGRESS)
taskRoutes.post('/:id/claim', (req, res) => {
  try {
    const { agent } = req.body;
    if (!agent) {
      res.status(400).json({ error: 'Agent name is required' });
      return;
    }

    const task = taskQueries.claim(req.params.id, agent);
    if (!task) {
      res.status(404).json({ error: 'Task not found or not in READY status' });
      return;
    }

    eventQueries.create('task.claimed', {
      taskId: task.id,
      agentName: agent,
      message: `${agent} claimed: ${task.title}`,
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Complete task (IN_PROGRESS -> DONE)
taskRoutes.post('/:id/complete', (req, res) => {
  try {
    const { summary, files_changed } = req.body;

    const task = taskQueries.complete(req.params.id, summary, files_changed);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    eventQueries.create('task.completed', {
      taskId: task.id,
      agentName: task.assigned_to || undefined,
      message: `Completed: ${task.title}`,
      data: { summary, files_changed },
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Start QA (DONE -> QA_TESTING)
taskRoutes.post('/:id/qa-start', (req, res) => {
  try {
    const task = taskQueries.updateStatus(req.params.id, 'QA_TESTING');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    eventQueries.create('task.qa_started', {
      taskId: task.id,
      message: `QA started: ${task.title}`,
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Pass QA (QA_TESTING -> QA_PASSED)
taskRoutes.post('/:id/qa-pass', (req, res) => {
  try {
    const task = taskQueries.updateStatus(req.params.id, 'QA_PASSED');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    eventQueries.create('task.qa_passed', {
      taskId: task.id,
      message: `QA passed: ${task.title}`,
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Fail QA (QA_TESTING -> QA_FAILED)
taskRoutes.post('/:id/qa-fail', (req, res) => {
  try {
    const { reason } = req.body;

    const task = taskQueries.updateStatus(req.params.id, 'QA_FAILED');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    eventQueries.create('task.qa_failed', {
      taskId: task.id,
      message: `QA failed: ${task.title}`,
      data: { reason },
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Ship task (QA_PASSED/REVIEWED -> SHIPPED)
taskRoutes.post('/:id/ship', (req, res) => {
  try {
    const task = taskQueries.updateStatus(req.params.id, 'SHIPPED');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    eventQueries.create('task.shipped', {
      taskId: task.id,
      message: `Shipped: ${task.title}`,
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generic status update
taskRoutes.post('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const task = taskQueries.updateStatus(req.params.id, status as TaskStatus);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
