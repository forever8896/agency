-- Agency v3 SQLite Schema
-- Replaces markdown-based state management with structured database

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================================
-- TASKS (replaces backlog.md and inbox.md)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,

    -- Workflow status
    status TEXT NOT NULL DEFAULT 'INBOX' CHECK (status IN (
        'INBOX',        -- New request, not yet triaged
        'READY',        -- Triaged, available for claiming
        'IN_PROGRESS',  -- Being worked on
        'DONE',         -- Dev completed, awaiting QA
        'QA_TESTING',   -- QA actively testing
        'QA_PASSED',    -- Verified, ready for deploy or review
        'QA_FAILED',    -- Failed QA, back to dev
        'REVIEWING',    -- Code review in progress
        'REVIEWED',     -- Review approved
        'SHIPPED'       -- Deployed to production
    )),

    -- Priority (P0 = critical, P3 = nice-to-have)
    priority TEXT DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),

    -- Size estimate
    size TEXT DEFAULT 'M' CHECK (size IN ('S', 'M', 'L', 'XL')),

    -- Assignment
    assigned_to TEXT,
    claimed_at INTEGER,

    -- Content
    value_statement TEXT,
    acceptance_criteria TEXT DEFAULT '[]',  -- JSON array
    context TEXT,
    files_changed TEXT DEFAULT '[]',        -- JSON array
    summary TEXT,

    -- Flags
    review_required INTEGER DEFAULT 0,

    -- Timestamps (Unix epoch milliseconds)
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    completed_at INTEGER,
    shipped_at INTEGER,

    -- Ordering
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS tasks_updated_at
    AFTER UPDATE ON tasks
    FOR EACH ROW
BEGIN
    UPDATE tasks SET updated_at = strftime('%s', 'now') * 1000 WHERE id = NEW.id;
END;

-- ============================================================================
-- AGENTS (agent definitions and runtime status)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
    name TEXT PRIMARY KEY,

    -- Agent classification
    type TEXT NOT NULL CHECK (type IN (
        'product-owner', 'tech-lead', 'developer', 'qa', 'reviewer', 'devops'
    )),
    specialization TEXT,

    -- Runtime status
    status TEXT DEFAULT 'OFFLINE' CHECK (status IN (
        'OFFLINE',      -- Not running
        'IDLE',         -- Running but no work
        'WORKING',      -- Actively processing
        'PAUSED',       -- User-paused
        'BLOCKED'       -- Waiting on something
    )),

    -- Current work
    current_task_id TEXT REFERENCES tasks(id),
    working_on TEXT,
    blocker TEXT,

    -- Process info
    pid INTEGER,
    session_id TEXT,

    -- Timestamps
    last_heartbeat INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Pre-populate agents
INSERT OR IGNORE INTO agents (name, type, specialization) VALUES
    ('product-owner', 'product-owner', 'product'),
    ('tech-lead', 'tech-lead', 'architecture'),
    ('dev-alpha', 'developer', 'general'),
    ('dev-beta', 'developer', 'backend'),
    ('dev-gamma', 'developer', 'frontend'),
    ('qa', 'qa', 'testing'),
    ('reviewer', 'reviewer', 'code-quality'),
    ('devops', 'devops', 'deployment');

-- ============================================================================
-- AGENT_SESSIONS (Claude session tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL REFERENCES agents(name),
    claude_session_id TEXT,     -- Claude's internal session ID for resume

    -- Session status
    status TEXT DEFAULT 'RUNNING' CHECK (status IN (
        'RUNNING',      -- Active session
        'PAUSED',       -- User-paused
        'COMPLETED',    -- Ended normally
        'FAILED',       -- Errored
        'TERMINATED'    -- Force-stopped
    )),

    -- What task (nullable)
    task_id TEXT REFERENCES tasks(id),

    -- Process info
    pid INTEGER,

    -- Timing
    started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    ended_at INTEGER,

    -- Metrics
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,

    -- Exit info
    exit_code INTEGER,
    exit_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_agent ON agent_sessions(agent_name);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_task ON agent_sessions(task_id);

-- ============================================================================
-- MESSAGES (conversation history for interception)
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES agent_sessions(id),

    -- Message content
    role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'injected')),
    content TEXT NOT NULL,

    -- Tool calls (JSON)
    tool_calls TEXT,
    tool_results TEXT,

    -- Injection tracking
    injected INTEGER DEFAULT 0,
    injected_by TEXT,

    -- Ordering
    sequence INTEGER NOT NULL,

    -- Timestamp
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- ============================================================================
-- HANDOFFS (inter-agent communication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY,

    -- Routing
    from_agent TEXT NOT NULL,
    to_agent TEXT,

    -- Classification
    type TEXT NOT NULL CHECK (type IN (
        'task-handoff',
        'bug-report',
        'clarification',
        'design-doc',
        'review-request',
        'blocker',
        'general'
    )),

    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,

    -- Related task
    task_id TEXT REFERENCES tasks(id),

    -- Status
    status TEXT DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'CLAIMED',
        'RESOLVED',
        'DISMISSED'
    )),
    claimed_by TEXT,

    -- Priority
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Timestamps
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    claimed_at INTEGER,
    resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_handoffs_to ON handoffs(to_agent);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON handoffs(status);
CREATE INDEX IF NOT EXISTS idx_handoffs_type ON handoffs(type);

-- ============================================================================
-- EVENTS (activity log for real-time UI)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Event type
    type TEXT NOT NULL,

    -- Related entities
    agent_name TEXT,
    task_id TEXT,
    session_id TEXT,
    handoff_id TEXT,

    -- Payload (JSON)
    data TEXT DEFAULT '{}',

    -- Human-readable message
    message TEXT,

    -- Timestamp
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_name);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active work view
CREATE VIEW IF NOT EXISTS v_active_work AS
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.assigned_to,
    a.status as agent_status,
    t.claimed_at,
    (strftime('%s', 'now') * 1000 - t.claimed_at) / 86400000.0 as days_in_progress
FROM tasks t
LEFT JOIN agents a ON t.assigned_to = a.name
WHERE t.status IN ('IN_PROGRESS', 'QA_TESTING', 'REVIEWING')
ORDER BY
    CASE t.priority
        WHEN 'P0' THEN 1
        WHEN 'P1' THEN 2
        WHEN 'P2' THEN 3
        WHEN 'P3' THEN 4
    END,
    t.claimed_at;

-- Backlog summary
CREATE VIEW IF NOT EXISTS v_backlog_summary AS
SELECT
    status,
    COUNT(*) as count
FROM tasks
WHERE status != 'SHIPPED'
GROUP BY status;

-- Agent workload
CREATE VIEW IF NOT EXISTS v_agent_workload AS
SELECT
    a.name,
    a.type,
    a.status,
    a.working_on,
    COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as active_tasks,
    a.last_heartbeat
FROM agents a
LEFT JOIN tasks t ON a.name = t.assigned_to
GROUP BY a.name;
