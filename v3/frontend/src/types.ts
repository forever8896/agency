// Agency v3 Frontend Types

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

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  size: 'S' | 'M' | 'L' | 'XL';
  assigned_to: string | null;
  claimed_at: number | null;
  value_statement: string | null;
  acceptance_criteria: string[];
  context: string | null;
  files_changed: string[];
  summary: string | null;
  review_required: boolean;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  shipped_at: number | null;
}

export type AgentStatus = 'OFFLINE' | 'IDLE' | 'WORKING' | 'PAUSED' | 'BLOCKED';

export interface Agent {
  name: string;
  type: string;
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

export interface Handoff {
  id: string;
  from_agent: string;
  to_agent: string | null;
  type: string;
  title: string;
  content: string;
  task_id: string | null;
  status: 'PENDING' | 'CLAIMED' | 'RESOLVED' | 'DISMISSED';
  claimed_by: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: number;
}

export interface AgencyEvent {
  id: number;
  type: string;
  agent_name: string | null;
  task_id: string | null;
  session_id: string | null;
  data: Record<string, unknown>;
  message: string | null;
  created_at: number;
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

export interface DashboardState {
  tasks: Task[];
  agents: Agent[];
  handoffs: Handoff[];
  recentEvents: AgencyEvent[];
}

// Agent output event data
export interface AgentOutputData {
  agent: string;
  chunk: string;
  events: Array<{
    type: string;
    content?: string;
    name?: string;
    id?: string;
  }>;
}

// SSE Event types
export type SSEEvent =
  | { type: 'connected'; timestamp: number }
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'state'; data: DashboardState }
  | { type: 'event'; data: AgencyEvent }
  | { type: 'agent:output'; data: AgentOutputData }
  | { type: 'agent:state'; data: { agent: string; from: AgentStatus; to: AgentStatus } };
