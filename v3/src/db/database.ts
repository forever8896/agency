// Agency v3 - SQLite Database Connection

import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  Agent,
  AgentSession,
  Message,
  Handoff,
  CreateHandoffInput,
  AgencyEvent,
  EventType,
  TaskStatus,
  AgentStatus,
  SessionStatus,
} from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database singleton
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/agency.db');

    // Ensure the directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory: ${dbDir}`);
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDatabase();
  // Schema is in src/db, not dist/db - navigate from dist to src
  let schemaPath = join(__dirname, 'schema.sql');
  // If running from dist, look in src instead
  if (__dirname.includes('/dist/')) {
    schemaPath = __dirname.replace('/dist/', '/src/') + '/schema.sql';
  }
  const schema = readFileSync(schemaPath, 'utf-8');
  database.exec(schema);
  console.log('Database initialized successfully');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================================================
// Task Queries
// ============================================================================

export const taskQueries = {
  create(input: CreateTaskInput): Task {
    const database = getDatabase();
    const id = uuid();
    const now = Date.now();

    const stmt = database.prepare(`
      INSERT INTO tasks (id, title, description, priority, size, value_statement, acceptance_criteria, context, review_required, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.title,
      input.description || null,
      input.priority || 'P2',
      input.size || 'M',
      input.value_statement || null,
      JSON.stringify(input.acceptance_criteria || []),
      input.context || null,
      input.review_required ? 1 : 0,
      now,
      now
    );

    return taskQueries.getById(id)!;
  },

  getById(id: string): Task | null {
    const database = getDatabase();
    const row = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToTask(row) : null;
  },

  list(options: { status?: TaskStatus | TaskStatus[]; assignedTo?: string; limit?: number; offset?: number } = {}): Task[] {
    const database = getDatabase();
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: unknown[] = [];

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      query += ` AND status IN (${statuses.map(() => '?').join(', ')})`;
      params.push(...statuses);
    }

    if (options.assignedTo) {
      query += ' AND assigned_to = ?';
      params.push(options.assignedTo);
    }

    query += " ORDER BY CASE priority WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 WHEN 'P3' THEN 4 END, sort_order, created_at";

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = database.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map(rowToTask);
  },

  update(id: string, input: UpdateTaskInput): Task | null {
    const database = getDatabase();
    const task = taskQueries.getById(id);
    if (!task) return null;

    const updates: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        if (key === 'acceptance_criteria' || key === 'files_changed') {
          updates.push(`${key} = ?`);
          params.push(JSON.stringify(value));
        } else if (key === 'review_required') {
          updates.push(`${key} = ?`);
          params.push(value ? 1 : 0);
        } else {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }
    }

    if (updates.length === 0) return task;

    params.push(id);
    database.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    return taskQueries.getById(id);
  },

  claim(id: string, agentName: string): Task | null {
    const database = getDatabase();
    const now = Date.now();

    database.prepare(`
      UPDATE tasks
      SET status = 'IN_PROGRESS', assigned_to = ?, claimed_at = ?
      WHERE id = ? AND status = 'READY'
    `).run(agentName, now, id);

    return taskQueries.getById(id);
  },

  complete(id: string, summary?: string, filesChanged?: string[]): Task | null {
    const database = getDatabase();
    const now = Date.now();

    database.prepare(`
      UPDATE tasks
      SET status = 'DONE', summary = ?, files_changed = ?, completed_at = ?
      WHERE id = ?
    `).run(
      summary || null,
      JSON.stringify(filesChanged || []),
      now,
      id
    );

    return taskQueries.getById(id);
  },

  updateStatus(id: string, status: TaskStatus): Task | null {
    const updates: Record<string, unknown> = { status };

    if (status === 'SHIPPED') {
      updates.shipped_at = Date.now();
    }

    return taskQueries.update(id, updates as UpdateTaskInput);
  },

  delete(id: string): boolean {
    const database = getDatabase();
    const result = database.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  },

  count(status?: TaskStatus): number {
    const database = getDatabase();
    if (status) {
      const row = database.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get(status) as { count: number };
      return row.count;
    }
    const row = database.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
    return row.count;
  },
};

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as TaskStatus,
    priority: row.priority as Task['priority'],
    size: row.size as Task['size'],
    assigned_to: row.assigned_to as string | null,
    claimed_at: row.claimed_at as number | null,
    value_statement: row.value_statement as string | null,
    acceptance_criteria: JSON.parse((row.acceptance_criteria as string) || '[]'),
    context: row.context as string | null,
    files_changed: JSON.parse((row.files_changed as string) || '[]'),
    summary: row.summary as string | null,
    review_required: Boolean(row.review_required),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
    completed_at: row.completed_at as number | null,
    shipped_at: row.shipped_at as number | null,
    sort_order: row.sort_order as number,
  };
}

// ============================================================================
// Agent Queries
// ============================================================================

export const agentQueries = {
  getAll(): Agent[] {
    const database = getDatabase();
    const rows = database.prepare('SELECT * FROM agents ORDER BY name').all() as Record<string, unknown>[];
    return rows.map(rowToAgent);
  },

  getByName(name: string): Agent | null {
    const database = getDatabase();
    const row = database.prepare('SELECT * FROM agents WHERE name = ?').get(name) as Record<string, unknown> | undefined;
    return row ? rowToAgent(row) : null;
  },

  updateStatus(name: string, status: AgentStatus, workingOn?: string, blocker?: string): Agent | null {
    const database = getDatabase();
    const now = Date.now();

    database.prepare(`
      UPDATE agents
      SET status = ?, working_on = ?, blocker = ?, last_heartbeat = ?, updated_at = ?
      WHERE name = ?
    `).run(status, workingOn || null, blocker || null, now, now, name);

    return agentQueries.getByName(name);
  },

  updateSession(name: string, sessionId: string | null, pid: number | null, taskId: string | null): Agent | null {
    const database = getDatabase();
    const now = Date.now();

    database.prepare(`
      UPDATE agents
      SET session_id = ?, pid = ?, current_task_id = ?, updated_at = ?
      WHERE name = ?
    `).run(sessionId, pid, taskId, now, name);

    return agentQueries.getByName(name);
  },

  heartbeat(name: string): Agent | null {
    const database = getDatabase();
    const now = Date.now();

    database.prepare(`
      UPDATE agents SET last_heartbeat = ?, updated_at = ? WHERE name = ?
    `).run(now, now, name);

    return agentQueries.getByName(name);
  },
};

function rowToAgent(row: Record<string, unknown>): Agent {
  return {
    name: row.name as string,
    type: row.type as Agent['type'],
    specialization: row.specialization as string | null,
    status: row.status as AgentStatus,
    current_task_id: row.current_task_id as string | null,
    working_on: row.working_on as string | null,
    blocker: row.blocker as string | null,
    pid: row.pid as number | null,
    session_id: row.session_id as string | null,
    last_heartbeat: row.last_heartbeat as number | null,
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

// ============================================================================
// Session Queries
// ============================================================================

export const sessionQueries = {
  create(agentName: string, claudeSessionId: string, taskId?: string): AgentSession {
    const database = getDatabase();
    const id = uuid();
    const now = Date.now();

    database.prepare(`
      INSERT INTO agent_sessions (id, agent_name, claude_session_id, task_id, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, agentName, claudeSessionId, taskId || null, now);

    return sessionQueries.getById(id)!;
  },

  getById(id: string): AgentSession | null {
    const database = getDatabase();
    const row = database.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToSession(row) : null;
  },

  getByAgent(agentName: string, status?: SessionStatus): AgentSession[] {
    const database = getDatabase();
    let query = 'SELECT * FROM agent_sessions WHERE agent_name = ?';
    const params: unknown[] = [agentName];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY started_at DESC';

    const rows = database.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map(rowToSession);
  },

  updateStatus(id: string, status: SessionStatus, exitCode?: number, exitReason?: string): AgentSession | null {
    const database = getDatabase();
    const now = Date.now();

    database.prepare(`
      UPDATE agent_sessions
      SET status = ?, ended_at = ?, exit_code = ?, exit_reason = ?
      WHERE id = ?
    `).run(status, status !== 'RUNNING' && status !== 'PAUSED' ? now : null, exitCode || null, exitReason || null, id);

    return sessionQueries.getById(id);
  },

  updatePid(id: string, pid: number | null): AgentSession | null {
    const database = getDatabase();
    database.prepare('UPDATE agent_sessions SET pid = ? WHERE id = ?').run(pid, id);
    return sessionQueries.getById(id);
  },
};

function rowToSession(row: Record<string, unknown>): AgentSession {
  return {
    id: row.id as string,
    agent_name: row.agent_name as string,
    claude_session_id: row.claude_session_id as string | null,
    status: row.status as SessionStatus,
    task_id: row.task_id as string | null,
    pid: row.pid as number | null,
    started_at: row.started_at as number,
    ended_at: row.ended_at as number | null,
    input_tokens: row.input_tokens as number,
    output_tokens: row.output_tokens as number,
    exit_code: row.exit_code as number | null,
    exit_reason: row.exit_reason as string | null,
  };
}

// ============================================================================
// Message Queries
// ============================================================================

export const messageQueries = {
  create(sessionId: string, role: Message['role'], content: string, options: { injected?: boolean; injectedBy?: string } = {}): Message {
    const database = getDatabase();

    // Get next sequence number
    const lastSeq = database.prepare(
      'SELECT MAX(sequence) as seq FROM messages WHERE session_id = ?'
    ).get(sessionId) as { seq: number | null };
    const sequence = (lastSeq.seq || 0) + 1;

    const result = database.prepare(`
      INSERT INTO messages (session_id, role, content, injected, injected_by, sequence)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      role,
      content,
      options.injected ? 1 : 0,
      options.injectedBy || null,
      sequence
    );

    return messageQueries.getById(result.lastInsertRowid as number)!;
  },

  getById(id: number): Message | null {
    const database = getDatabase();
    const row = database.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToMessage(row) : null;
  },

  getBySession(sessionId: string): Message[] {
    const database = getDatabase();
    const rows = database.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY sequence'
    ).all(sessionId) as Record<string, unknown>[];
    return rows.map(rowToMessage);
  },
};

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as number,
    session_id: row.session_id as string,
    role: row.role as Message['role'],
    content: row.content as string,
    tool_calls: row.tool_calls ? JSON.parse(row.tool_calls as string) : null,
    tool_results: row.tool_results ? JSON.parse(row.tool_results as string) : null,
    injected: Boolean(row.injected),
    injected_by: row.injected_by as string | null,
    sequence: row.sequence as number,
    created_at: row.created_at as number,
  };
}

// ============================================================================
// Handoff Queries
// ============================================================================

export const handoffQueries = {
  create(input: CreateHandoffInput): Handoff {
    const database = getDatabase();
    const id = uuid();

    database.prepare(`
      INSERT INTO handoffs (id, from_agent, to_agent, type, title, content, task_id, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.from_agent,
      input.to_agent || null,
      input.type,
      input.title,
      input.content,
      input.task_id || null,
      input.priority || 'normal'
    );

    return handoffQueries.getById(id)!;
  },

  getById(id: string): Handoff | null {
    const database = getDatabase();
    const row = database.prepare('SELECT * FROM handoffs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToHandoff(row) : null;
  },

  list(options: { toAgent?: string; status?: Handoff['status']; limit?: number } = {}): Handoff[] {
    const database = getDatabase();
    let query = 'SELECT * FROM handoffs WHERE 1=1';
    const params: unknown[] = [];

    if (options.toAgent) {
      query += ' AND (to_agent = ? OR to_agent IS NULL)';
      params.push(options.toAgent);
    }

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    query += " ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END, created_at DESC";

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = database.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map(rowToHandoff);
  },

  claim(id: string, agentName: string): Handoff | null {
    const database = getDatabase();
    const now = Date.now();

    database.prepare(`
      UPDATE handoffs
      SET status = 'CLAIMED', claimed_by = ?, claimed_at = ?
      WHERE id = ? AND status = 'PENDING'
    `).run(agentName, now, id);

    return handoffQueries.getById(id);
  },

  resolve(id: string): Handoff | null {
    const database = getDatabase();
    const now = Date.now();

    database.prepare(`
      UPDATE handoffs SET status = 'RESOLVED', resolved_at = ? WHERE id = ?
    `).run(now, id);

    return handoffQueries.getById(id);
  },
};

function rowToHandoff(row: Record<string, unknown>): Handoff {
  return {
    id: row.id as string,
    from_agent: row.from_agent as string,
    to_agent: row.to_agent as string | null,
    type: row.type as Handoff['type'],
    title: row.title as string,
    content: row.content as string,
    task_id: row.task_id as string | null,
    status: row.status as Handoff['status'],
    claimed_by: row.claimed_by as string | null,
    priority: row.priority as Handoff['priority'],
    created_at: row.created_at as number,
    claimed_at: row.claimed_at as number | null,
    resolved_at: row.resolved_at as number | null,
  };
}

// ============================================================================
// Event Queries
// ============================================================================

export const eventQueries = {
  create(type: EventType, options: {
    agentName?: string;
    taskId?: string;
    sessionId?: string;
    handoffId?: string;
    data?: Record<string, unknown>;
    message?: string;
  } = {}): AgencyEvent {
    const database = getDatabase();

    const result = database.prepare(`
      INSERT INTO events (type, agent_name, task_id, session_id, handoff_id, data, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      type,
      options.agentName || null,
      options.taskId || null,
      options.sessionId || null,
      options.handoffId || null,
      JSON.stringify(options.data || {}),
      options.message || null
    );

    return eventQueries.getById(result.lastInsertRowid as number)!;
  },

  getById(id: number): AgencyEvent | null {
    const database = getDatabase();
    const row = database.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToEvent(row) : null;
  },

  list(options: { type?: EventType; limit?: number; since?: number } = {}): AgencyEvent[] {
    const database = getDatabase();
    let query = 'SELECT * FROM events WHERE 1=1';
    const params: unknown[] = [];

    if (options.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }

    if (options.since) {
      query += ' AND created_at > ?';
      params.push(options.since);
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = database.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map(rowToEvent);
  },
};

function rowToEvent(row: Record<string, unknown>): AgencyEvent {
  return {
    id: row.id as number,
    type: row.type as EventType,
    agent_name: row.agent_name as string | null,
    task_id: row.task_id as string | null,
    session_id: row.session_id as string | null,
    handoff_id: row.handoff_id as string | null,
    data: JSON.parse((row.data as string) || '{}'),
    message: row.message as string | null,
    created_at: row.created_at as number,
  };
}
