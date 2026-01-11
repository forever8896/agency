// Agency v3 - Core Type Definitions

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus =
  | 'INBOX'
  | 'READY'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'QA_TESTING'
  | 'QA_PASSED'
  | 'QA_FAILED'
  | 'REVIEWING'
  | 'REVIEWED'
  | 'SHIPPED';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type Size = 'S' | 'M' | 'L' | 'XL';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  size: Size;
  assigned_to: string | null;
  claimed_at: number | null;
  value_statement: string | null;
  acceptance_criteria: string[]; // Stored as JSON
  context: string | null;
  files_changed: string[]; // Stored as JSON
  summary: string | null;
  review_required: boolean;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  shipped_at: number | null;
  sort_order: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  size?: Size;
  value_statement?: string;
  acceptance_criteria?: string[];
  context?: string;
  review_required?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  size?: Size;
  assigned_to?: string | null;
  value_statement?: string;
  acceptance_criteria?: string[];
  context?: string;
  files_changed?: string[];
  summary?: string;
  review_required?: boolean;
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentType =
  | 'product-owner'
  | 'tech-lead'
  | 'developer'
  | 'qa'
  | 'reviewer'
  | 'devops';

export type AgentStatus = 'OFFLINE' | 'IDLE' | 'WORKING' | 'PAUSED' | 'BLOCKED';

export interface Agent {
  name: string;
  type: AgentType;
  specialization: string | null;
  status: AgentStatus;
  current_task_id: string | null;
  working_on: string | null;
  blocker: string | null;
  pid: number | null;
  session_id: string | null;
  last_heartbeat: number | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionStatus =
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'TERMINATED';

export interface AgentSession {
  id: string;
  agent_name: string;
  claude_session_id: string | null;
  status: SessionStatus;
  task_id: string | null;
  pid: number | null;
  started_at: number;
  ended_at: number | null;
  input_tokens: number;
  output_tokens: number;
  exit_code: number | null;
  exit_reason: string | null;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'injected';

export interface Message {
  id: number;
  session_id: string;
  role: MessageRole;
  content: string;
  tool_calls: ToolCall[] | null; // Stored as JSON
  tool_results: ToolResult[] | null; // Stored as JSON
  injected: boolean;
  injected_by: string | null;
  sequence: number;
  created_at: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error: boolean;
}

// ============================================================================
// Handoff Types
// ============================================================================

export type HandoffType =
  | 'task-handoff'
  | 'bug-report'
  | 'clarification'
  | 'design-doc'
  | 'review-request'
  | 'blocker'
  | 'general';

export type HandoffStatus = 'PENDING' | 'CLAIMED' | 'RESOLVED' | 'DISMISSED';
export type HandoffPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Handoff {
  id: string;
  from_agent: string;
  to_agent: string | null;
  type: HandoffType;
  title: string;
  content: string;
  task_id: string | null;
  status: HandoffStatus;
  claimed_by: string | null;
  priority: HandoffPriority;
  created_at: number;
  claimed_at: number | null;
  resolved_at: number | null;
}

export interface CreateHandoffInput {
  from_agent: string;
  to_agent?: string;
  type: HandoffType;
  title: string;
  content: string;
  task_id?: string;
  priority?: HandoffPriority;
}

// ============================================================================
// Event Types
// ============================================================================

export type EventType =
  // Task lifecycle
  | 'task.created'
  | 'task.updated'
  | 'task.claimed'
  | 'task.completed'
  | 'task.qa_started'
  | 'task.qa_passed'
  | 'task.qa_failed'
  | 'task.shipped'
  // Agent lifecycle
  | 'agent.started'
  | 'agent.stopped'
  | 'agent.paused'
  | 'agent.resumed'
  | 'agent.heartbeat'
  | 'agent.blocked'
  | 'agent.output'
  | 'agent.injected'
  | 'agent.redirected'
  | 'agent.message'
  | 'agent.tool.start'
  | 'agent.tool.complete'
  // Session lifecycle
  | 'session.started'
  | 'session.message'
  | 'session.tool_call'
  | 'session.completed'
  | 'session.failed'
  // Handoffs
  | 'handoff.created'
  | 'handoff.claimed'
  | 'handoff.resolved'
  // System
  | 'system.startup'
  | 'system.shutdown'
  | 'system.error'
  // Orchestrator
  | 'orchestrator.assigned'
  | 'orchestrator.enabled'
  | 'orchestrator.disabled';

export interface AgencyEvent {
  id: number;
  type: EventType;
  agent_name: string | null;
  task_id: string | null;
  session_id: string | null;
  handoff_id: string | null;
  data: Record<string, unknown>;
  message: string | null;
  created_at: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DashboardSummary {
  tasks: {
    inbox: number;
    ready: number;
    in_progress: number;
    done: number;
    qa_testing: number;
    shipped_today: number;
  };
  agents: {
    online: number;
    working: number;
    idle: number;
    blocked: number;
  };
}

// ============================================================================
// Agent Controller Types
// ============================================================================

export interface SpawnOptions {
  taskId?: string;
  prompt?: string;
}

export interface InjectOptions {
  message: string;
  injectedBy?: string;
}

export interface AgentControllerState {
  agentName: string;
  sessionId: string | null;
  claudeSessionId: string | null;
  status: AgentStatus;
  pid: number | null;
  currentTaskId: string | null;
  messages: Message[];
  startedAt: number | null;
  lastActivity: number | null;
}

// ============================================================================
// SSE Event Types (sent to clients)
// ============================================================================

export type SSEEvent =
  | { type: 'connected'; timestamp: number }
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'state'; data: DashboardState }
  | { type: 'event'; data: AgencyEvent }
  | { type: 'agent:output'; data: { agent: string; chunk: string; events: unknown[] } }
  | { type: 'agent:state'; data: { agent: string; from: AgentStatus; to: AgentStatus } }
  | { type: 'agent.output'; agentName: string; chunk: string; isPartial: boolean }
  | { type: 'error'; message: string };

export interface DashboardState {
  tasks: Task[];
  agents: Agent[];
  handoffs: Handoff[];
  recentEvents: AgencyEvent[];
}
