# Agency v3

A visual web-based platform for orchestrating teams of Claude Code agents. Create tasks, assign them to agents, and watch them work in real-time through your browser.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Your Browser                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     React Dashboard (port 5173)                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────┐ ││
│  │  │ Kanban Board │  │ Agent Panel  │  │ Task Creation / Detail Modal  │ ││
│  │  │  (6 columns) │  │ (8 agents)   │  │ (view, edit, transition)      │ ││
│  │  └──────────────┘  └──────────────┘  └────────────────────────────────┘ ││
│  └──────────────────────────────────┬──────────────────────────────────────┘│
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ HTTP + SSE
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API Server (port 3000)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Task Routes │  │Agent Routes │  │ SSE Events  │  │  Dashboard Routes   │ │
│  │ CRUD + Flow │  │Start/Stop/  │  │ Real-time   │  │  Summary + Board    │ │
│  │             │  │Pause/Inject │  │ Updates     │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │           │
│         └────────────────┴────────────────┴─────────────────────┘           │
│                                   │                                          │
│  ┌────────────────────────────────┴────────────────────────────────────────┐│
│  │                           Agent Manager                                  ││
│  │  Orchestrates multiple AgentControllers, assigns work, manages lifecycle ││
│  └────────────────────────────────┬────────────────────────────────────────┘│
│                                   │                                          │
│  ┌────────────────────────────────┴────────────────────────────────────────┐│
│  │                         Agent Controllers                                ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        ││
│  │  │ dev-alpha   │ │ dev-beta    │ │ dev-gamma   │ │    qa       │  ...   ││
│  │  │ (Claude CLI)│ │ (Claude CLI)│ │ (Claude CLI)│ │ (Claude CLI)│        ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                   │                                          │
│  ┌────────────────────────────────┴────────────────────────────────────────┐│
│  │                          SQLite Database                                 ││
│  │  tasks │ agents │ sessions │ messages │ handoffs │ events               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## How Orchestration Works

### 1. Task Flow (Kanban)

Tasks move through these statuses:

```
INBOX → READY → IN_PROGRESS → DONE → QA_TESTING → QA_PASSED → SHIPPED
                                   ↘ QA_FAILED ↗
```

- **INBOX**: New tasks awaiting triage
- **READY**: Approved tasks ready for an agent to claim
- **IN_PROGRESS**: Agent is actively working on task
- **DONE**: Agent completed work, ready for QA
- **QA_TESTING**: QA agent is testing
- **QA_PASSED/FAILED**: Test results
- **SHIPPED**: Deployed to production

### 2. Agent Lifecycle

Each agent is managed by an `AgentController` that spawns and controls a Claude CLI process:

```typescript
// Start an agent
POST /api/agents/dev-alpha/start
// Spawns: claude -p "AGENT.md content" --output-format stream-json --session-id <uuid>

// Pause (SIGSTOP)
POST /api/agents/dev-alpha/pause
// Sends SIGSTOP to pause the process

// Resume (SIGCONT)
POST /api/agents/dev-alpha/resume
// Sends SIGCONT to resume

// Inject message (interrupt + continue with new input)
POST /api/agents/dev-alpha/inject
// Body: { "message": "Stop current work and do X instead" }
// Kills current process, resumes session with new message via stdin

// Stop
POST /api/agents/dev-alpha/stop
// Sends SIGINT, then SIGKILL if needed
```

### 3. Agent Communication

Agents communicate through:

1. **Database API**: Agents call HTTP endpoints to claim tasks, mark complete, etc.
2. **Handoffs**: Structured messages between agents (bug reports, clarifications, etc.)
3. **Events**: All actions logged for audit trail and real-time updates

### 4. Real-time Updates

The dashboard connects via Server-Sent Events (SSE):

```javascript
// Frontend connects to SSE stream
const eventSource = new EventSource('/api/events/stream');

eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  // event.type: 'connected' | 'state' | 'event' | 'heartbeat'
  // Automatically updates UI when tasks/agents change
};
```

## Quick Start

### Prerequisites

- Node.js 20+
- Claude CLI installed (`claude` command available)

### Install & Run

```bash
cd v3

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Initialize database (first time only)
npm run db:init

# Optional: Import tasks from old markdown format
npm run db:migrate

# Start backend (port 3000)
npm run dev

# In another terminal, start frontend (port 5173)
npm run dev:frontend
```

Open http://localhost:5173 in your browser.

## Project Structure

```
v3/
├── src/                          # Backend (TypeScript/Node.js)
│   ├── index.ts                  # Express server entry point
│   ├── db/
│   │   ├── schema.sql            # SQLite schema
│   │   └── database.ts           # Database queries
│   ├── api/routes/
│   │   ├── tasks.ts              # Task CRUD + workflow
│   │   ├── agents.ts             # Agent control endpoints
│   │   ├── events.ts             # SSE stream
│   │   └── dashboard.ts          # Summary endpoints
│   ├── agents/
│   │   ├── agent-controller.ts   # Single agent process management
│   │   ├── agent-manager.ts      # Multi-agent orchestration
│   │   └── stream-parser.ts      # Parse Claude CLI output
│   └── types/
│       └── index.ts              # TypeScript types
│
├── frontend/                     # Frontend (React + Vite + Tailwind)
│   └── src/
│       ├── App.tsx               # Main app with SSE connection
│       ├── api.ts                # API client
│       ├── types.ts              # Frontend types
│       └── components/
│           ├── Header.tsx        # Top bar with stats
│           ├── KanbanBoard.tsx   # Task columns
│           ├── TaskCard.tsx      # Individual task card
│           ├── TaskModal.tsx     # Task detail/edit modal
│           ├── CreateTaskModal.tsx # New task form
│           └── AgentPanel.tsx    # Agent list with controls
│
├── data/
│   └── agency.db                 # SQLite database
│
└── scripts/
    ├── init-db.ts                # Create database
    └── migrate-from-markdown.ts  # Import old tasks
```

## API Reference

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List tasks (filter: ?status=READY) |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Get task details |
| PATCH | /api/tasks/:id | Update task |
| POST | /api/tasks/:id/claim | Claim task (body: {agent}) |
| POST | /api/tasks/:id/complete | Mark done |
| POST | /api/tasks/:id/status | Change status |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agents | List all agents |
| GET | /api/agents/:name | Get agent details |
| POST | /api/agents/:name/start | Start agent (spawns Claude) |
| POST | /api/agents/:name/stop | Stop agent |
| POST | /api/agents/:name/pause | Pause (SIGSTOP) |
| POST | /api/agents/:name/resume | Resume (SIGCONT) |
| POST | /api/agents/:name/inject | Inject message |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/events/stream | SSE stream for real-time updates |
| GET | /api/events | List recent events |

### Orchestration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agents/orchestration/status | Get orchestration status |
| POST | /api/agents/orchestration/enable | Enable auto-orchestration |
| POST | /api/agents/orchestration/disable | Disable auto-orchestration |
| POST | /api/agents/orchestration/run | Trigger manual orchestration cycle |

## Auto-Orchestration

The system supports automatic agent orchestration, similar to the old `agency.sh` script. When enabled:

1. Every 10 seconds (configurable), the orchestrator checks for:
   - Tasks in READY status
   - Agents in IDLE status with no running controller

2. It automatically starts idle agents with ready tasks

3. Control via the UI header toggle ("Auto ON/OFF") or API:
   ```bash
   # Enable with default 10s interval
   curl -X POST http://localhost:3000/api/agents/orchestration/enable

   # Enable with custom interval (5 seconds)
   curl -X POST http://localhost:3000/api/agents/orchestration/enable \
     -H "Content-Type: application/json" \
     -d '{"intervalMs": 5000}'

   # Disable
   curl -X POST http://localhost:3000/api/agents/orchestration/disable

   # Run single cycle manually
   curl -X POST http://localhost:3000/api/agents/orchestration/run
   ```

## Agent Types

The system comes with 8 pre-configured agents:

| Agent | Type | Role |
|-------|------|------|
| product-owner | product-owner | Creates and prioritizes tasks |
| tech-lead | tech-lead | Architectural decisions |
| dev-alpha | developer | General development |
| dev-beta | developer | Backend focus |
| dev-gamma | developer | Frontend focus |
| qa | qa | Testing and quality |
| reviewer | reviewer | Code review |
| devops | devops | Deployment |

## Key Features

- **Visual Task Management**: Kanban board with drag-and-drop (coming soon)
- **Agent Control**: Start/stop/pause/resume any agent from the UI
- **Auto-Orchestration**: Toggle automatic agent assignment (agents pick up READY tasks)
- **Message Injection**: Interrupt an agent mid-work with new instructions
- **Real-time Updates**: SSE keeps dashboard in sync with agent activity
- **Session Persistence**: Agents can be paused and resumed with full context
- **Event Logging**: Complete audit trail of all actions

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Backend server port |
| HOST | localhost | Backend host |
| DATABASE_PATH | ./data/agency.db | SQLite database path |
| AGENCY_DIR | (auto) | Path to agent definitions |
| PROJECTS_DIR | (auto) | Working directory for agents |
