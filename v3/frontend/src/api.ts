// Agency v3 API Client

import type { Task, Agent, DashboardSummary, DashboardState, Handoff, AgencyEvent } from './types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// ============================================================================
// Tasks API
// ============================================================================

export async function getTasks(filters?: { status?: string; limit?: number }): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const query = params.toString();
  const result = await fetchJSON<{ tasks: Task[] }>(`/tasks${query ? `?${query}` : ''}`);
  return result.tasks;
}

export async function getTask(id: string): Promise<Task> {
  return fetchJSON<Task>(`/tasks/${id}`);
}

export async function createTask(data: {
  title: string;
  description?: string;
  priority?: string;
  acceptance_criteria?: string[];
}): Promise<Task> {
  return fetchJSON<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return fetchJSON<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateTaskStatus(id: string, status: string): Promise<Task> {
  return fetchJSON<Task>(`/tasks/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function claimTask(id: string, agent: string): Promise<Task> {
  return fetchJSON<Task>(`/tasks/${id}/claim`, {
    method: 'POST',
    body: JSON.stringify({ agent }),
  });
}

export async function completeTask(id: string, summary?: string): Promise<Task> {
  return fetchJSON<Task>(`/tasks/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ summary }),
  });
}

// ============================================================================
// Agents API
// ============================================================================

export async function getAgents(): Promise<Agent[]> {
  const result = await fetchJSON<{ agents: Agent[] }>('/agents');
  return result.agents;
}

export async function getAgent(name: string): Promise<Agent> {
  return fetchJSON<Agent>(`/agents/${name}`);
}

export async function startAgent(name: string, taskId?: string): Promise<{ success: boolean; pid?: number; sessionId?: string }> {
  return fetchJSON(`/agents/${name}/start`, {
    method: 'POST',
    body: JSON.stringify({ taskId }),
  });
}

export async function stopAgent(name: string): Promise<{ success: boolean }> {
  return fetchJSON(`/agents/${name}/stop`, {
    method: 'POST',
  });
}

export async function pauseAgent(name: string, reason?: string): Promise<{ success: boolean }> {
  return fetchJSON(`/agents/${name}/pause`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function resumeAgent(name: string): Promise<{ success: boolean }> {
  return fetchJSON(`/agents/${name}/resume`, {
    method: 'POST',
  });
}

export async function injectMessage(name: string, message: string): Promise<{ success: boolean }> {
  return fetchJSON(`/agents/${name}/inject`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

// ============================================================================
// Orchestration API
// ============================================================================

export interface OrchestrationStatus {
  enabled: boolean;
  intervalMs: number;
}

export async function getOrchestrationStatus(): Promise<OrchestrationStatus> {
  return fetchJSON<OrchestrationStatus>('/agents/orchestration/status');
}

export async function enableOrchestration(intervalMs?: number): Promise<OrchestrationStatus & { success: boolean }> {
  return fetchJSON('/agents/orchestration/enable', {
    method: 'POST',
    body: JSON.stringify({ intervalMs }),
  });
}

export async function disableOrchestration(): Promise<OrchestrationStatus & { success: boolean }> {
  return fetchJSON('/agents/orchestration/disable', {
    method: 'POST',
  });
}

export async function runOrchestrationCycle(): Promise<{ success: boolean }> {
  return fetchJSON('/agents/orchestration/run', {
    method: 'POST',
  });
}

// ============================================================================
// Dashboard API
// ============================================================================

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchJSON<DashboardSummary>('/dashboard/summary');
}

export async function getDashboardState(): Promise<DashboardState> {
  return fetchJSON<DashboardState>('/dashboard/state');
}

export async function getHandoffs(): Promise<{ pending: Handoff[]; claimed: Handoff[] }> {
  return fetchJSON('/dashboard/handoffs');
}

export async function getRecentEvents(limit = 30): Promise<AgencyEvent[]> {
  const result = await fetchJSON<{ events: AgencyEvent[] }>(`/events?limit=${limit}`);
  return result.events;
}

// ============================================================================
// SSE Connection
// ============================================================================

export function connectSSE(onEvent: (event: unknown) => void): EventSource {
  const eventSource = new EventSource(`${API_BASE}/events/stream`);

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (err) {
      console.error('Failed to parse SSE event:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.error('SSE connection error:', err);
  };

  return eventSource;
}
