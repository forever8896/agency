import { useState, useEffect, useCallback, useRef } from 'react';
import { getTasks, getAgents, getDashboardSummary, getHandoffs, connectSSE } from './api';
import type { Task, Agent, DashboardSummary, SSEEvent, AgentOutputData, Handoff } from './types';
import { OfficeView } from './components/office/OfficeView';
import { CreateTaskModal } from './components/CreateTaskModal';

// Store agent output for display
export interface AgentOutput {
  agent: string;
  content: string;
  timestamp: number;
  type: 'content' | 'tool' | 'system';
}

// Per-agent output storage
export type AgentOutputMap = Map<string, AgentOutput[]>;

// Throttle helper
function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((...args: unknown[]) => {
    const now = Date.now();
    const elapsed = now - lastRun.current;

    if (elapsed >= delay) {
      lastRun.current = now;
      callback(...args);
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastRun.current = Date.now();
        timeoutRef.current = null;
        callback(...args);
      }, delay - elapsed);
    }
  }, [callback, delay]) as T;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  // Store outputs per-agent for agent-specific streaming
  const [agentOutputMap, setAgentOutputMap] = useState<AgentOutputMap>(new Map());
  // Legacy: combined outputs for global view
  const [agentOutputs, setAgentOutputs] = useState<AgentOutput[]>([]);

  // Buffer for batching output updates (reduces re-renders)
  const outputBufferRef = useRef<Map<string, AgentOutput[]>>(new Map());
  const globalBufferRef = useRef<AgentOutput[]>([]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksData, agentsData, summaryData, handoffsData] = await Promise.all([
        getTasks({ limit: 200 }),
        getAgents(),
        getDashboardSummary(),
        getHandoffs(),
      ]);
      setTasks(tasksData);
      setAgents(agentsData);
      setSummary(summaryData);
      // Combine pending and claimed handoffs
      setHandoffs([...handoffsData.pending, ...handoffsData.claimed]);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Flush buffered outputs to state (throttled to reduce re-renders)
  const flushOutputBuffers = useCallback(() => {
    // Flush per-agent buffers
    if (outputBufferRef.current.size > 0) {
      setAgentOutputMap(prev => {
        const newMap = new Map(prev);
        for (const [agentName, newOutputs] of outputBufferRef.current) {
          const existing = newMap.get(agentName) || [];
          // Keep last 100 outputs per agent (reduced for performance)
          newMap.set(agentName, [...existing, ...newOutputs].slice(-100));
        }
        return newMap;
      });
      outputBufferRef.current.clear();
    }

    // Flush global buffer
    if (globalBufferRef.current.length > 0) {
      setAgentOutputs(prev => [...prev, ...globalBufferRef.current].slice(-50));
      globalBufferRef.current = [];
    }
  }, []);

  // Throttled data fetch (max once per 2 seconds)
  const throttledFetchData = useThrottledCallback(fetchData, 2000);

  // Connect to SSE for real-time updates
  useEffect(() => {
    fetchData();

    // Flush output buffers every 200ms for smooth updates without lag
    const flushInterval = setInterval(flushOutputBuffers, 200);

    const eventSource = connectSSE((event: unknown) => {
      const sseEvent = event as SSEEvent;

      if (sseEvent.type === 'connected') {
        setConnected(true);
      } else if (sseEvent.type === 'state') {
        setTasks(sseEvent.data.tasks);
        setAgents(sseEvent.data.agents);
      } else if (sseEvent.type === 'event') {
        // Throttled refresh on events
        throttledFetchData();
      } else if (sseEvent.type === 'agent:output') {
        // Buffer agent outputs instead of immediate state update
        const outputData = sseEvent.data as AgentOutputData;
        const agentName = outputData.agent;

        for (const evt of outputData.events) {
          let content = '';
          let outputType: 'content' | 'tool' | 'system' = 'content';

          if (evt.type === 'content' && evt.content) {
            content = evt.content;
            outputType = 'content';
          } else if (evt.type === 'tool_use' && evt.name) {
            content = `🔧 ${evt.name}`;
            outputType = 'tool';
          } else if (evt.type === 'system' && evt.content) {
            content = `⚙️ ${evt.content}`;
            outputType = 'system';
          }

          if (content) {
            const newOutput: AgentOutput = {
              agent: agentName,
              content,
              timestamp: Date.now(),
              type: outputType,
            };

            // Add to buffers (will be flushed periodically)
            const agentBuffer = outputBufferRef.current.get(agentName) || [];
            agentBuffer.push(newOutput);
            outputBufferRef.current.set(agentName, agentBuffer);
            globalBufferRef.current.push(newOutput);
          }
        }
      } else if (sseEvent.type === 'agent:state') {
        // Throttled refresh on agent state change
        throttledFetchData();
      }
    });

    return () => {
      clearInterval(flushInterval);
      eventSource.close();
      setConnected(false);
    };
  }, [fetchData, flushOutputBuffers, throttledFetchData]);

  const handleTaskCreated = (task: Task) => {
    setTasks(prev => [task, ...prev]);
    setShowCreateTask(false);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleAgentAction = (_agent: Agent, _action: string) => {
    // Refresh data after agent action
    fetchData();
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading Agency v3...</div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 text-red-200 px-4 py-2 rounded shadow-lg">
          {error}
        </div>
      )}

      <OfficeView
        tasks={tasks}
        agents={agents}
        summary={summary}
        handoffs={handoffs}
        connected={connected}
        agentOutputs={agentOutputs}
        agentOutputMap={agentOutputMap}
        onTaskUpdate={handleTaskUpdated}
        onAgentAction={handleAgentAction}
        onCreateTask={() => setShowCreateTask(true)}
        onRefresh={fetchData}
      />

      {/* Create task modal */}
      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onCreate={handleTaskCreated}
        />
      )}
    </>
  );
}

export default App;
