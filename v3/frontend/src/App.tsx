import { useState, useEffect, useCallback } from 'react';
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

  // Connect to SSE for real-time updates
  useEffect(() => {
    fetchData();

    const eventSource = connectSSE((event: unknown) => {
      const sseEvent = event as SSEEvent;

      if (sseEvent.type === 'connected') {
        setConnected(true);
      } else if (sseEvent.type === 'state') {
        setTasks(sseEvent.data.tasks);
        setAgents(sseEvent.data.agents);
      } else if (sseEvent.type === 'event') {
        // Refresh data on events
        fetchData();
      } else if (sseEvent.type === 'agent:output') {
        // Handle agent output streaming
        const outputData = sseEvent.data as AgentOutputData;
        const agentName = outputData.agent;

        // Process each event
        for (const event of outputData.events) {
          let content = '';
          let outputType: 'content' | 'tool' | 'system' = 'content';

          if (event.type === 'content' && event.content) {
            content = event.content;
            outputType = 'content';
          } else if (event.type === 'tool_use' && event.name) {
            content = `🔧 Using tool: ${event.name}`;
            outputType = 'tool';
          } else if (event.type === 'system' && event.content) {
            content = `⚙️ ${event.content}`;
            outputType = 'system';
          }

          if (content) {
            const newOutput: AgentOutput = {
              agent: agentName,
              content,
              timestamp: Date.now(),
              type: outputType,
            };

            // Update per-agent output map
            setAgentOutputMap(prev => {
              const newMap = new Map(prev);
              const agentOutputs = newMap.get(agentName) || [];
              // Keep last 200 outputs per agent
              newMap.set(agentName, [...agentOutputs.slice(-199), newOutput]);
              return newMap;
            });

            // Also update global outputs for combined view
            setAgentOutputs(prev => {
              // Keep last 100 outputs globally
              return [...prev.slice(-99), newOutput];
            });
          }
        }
      } else if (sseEvent.type === 'agent:state') {
        // Agent state changed - refresh agent list
        fetchData();
      }
    });

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [fetchData]);

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
