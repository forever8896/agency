// Office View - Main composition with 3D canvas and HTML overlays

import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Agent, Task, DashboardSummary, Handoff } from '../../types';
import { IsometricOffice } from './IsometricOffice';
import { AgentDetailPanel } from './AgentDetailPanel';
import { TaskDetailPanel } from './TaskDetailPanel';
import { OfficeLegend } from './OfficeLegend';
import { AgentConsole } from './AgentConsole';
import { CommunicationDock } from './CommunicationDock';
import { Header } from '../Header';
import type { AgentOutput, AgentOutputMap } from '../../App';

interface OfficeViewProps {
  tasks: Task[];
  agents: Agent[];
  summary: DashboardSummary | null;
  handoffs: Handoff[];
  connected: boolean;
  agentOutputs: AgentOutput[];
  agentOutputMap: AgentOutputMap;
  onTaskUpdate: (task: Task) => void;
  onAgentAction: (agent: Agent, action: string) => void;
  onCreateTask: () => void;
  onRefresh: () => void;
}

export function OfficeView({
  tasks,
  agents,
  summary,
  handoffs,
  connected,
  agentOutputs,
  agentOutputMap,
  onTaskUpdate,
  onAgentAction,
  onCreateTask,
  onRefresh,
}: OfficeViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setSelectedTask(null);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setSelectedAgent(null);
  };

  const handleBackgroundClick = () => {
    setSelectedAgent(null);
    setSelectedTask(null);
  };

  const handleClosePanel = () => {
    setSelectedAgent(null);
    setSelectedTask(null);
  };

  return (
    <div className="h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        summary={summary}
        connected={connected}
        onCreateTask={onCreateTask}
        onRefresh={onRefresh}
      />

      {/* Main content */}
      <div className="flex-1 relative">
        {/* 3D Canvas */}
        <Canvas
          style={{ width: '100%', height: '100%' }}
          shadows
          gl={{ antialias: true }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <IsometricOffice
              agents={agents}
              tasks={tasks}
              selectedAgent={selectedAgent?.name || null}
              selectedTask={selectedTask?.id || null}
              onAgentClick={handleAgentClick}
              onTaskClick={handleTaskClick}
              onBackgroundClick={handleBackgroundClick}
            />
          </Suspense>
        </Canvas>

        {/* Loading overlay */}
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
              <div className="text-gray-400">Loading office...</div>
            </div>
          }
        >
          <div />
        </Suspense>

        {/* HTML Overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Legend */}
          <OfficeLegend className="pointer-events-auto" />

          {/* Communication Dock - Inbox, Backlog, Handoffs (left side) */}
          <CommunicationDock
            tasks={tasks}
            handoffs={handoffs}
            onTaskClick={handleTaskClick}
            className="pointer-events-auto"
          />

          {/* Agent console - shows streaming output (only when no agent selected) */}
          {!selectedAgent && (
            <AgentConsole outputs={agentOutputs} className="pointer-events-auto" />
          )}

          {/* Agent detail panel with agent-specific console */}
          {selectedAgent && (
            <AgentDetailPanel
              agent={selectedAgent}
              outputs={agentOutputMap.get(selectedAgent.name) || []}
              onClose={handleClosePanel}
              onAction={(action) => onAgentAction(selectedAgent, action)}
              className="pointer-events-auto"
            />
          )}

          {/* Task detail panel */}
          {selectedTask && (
            <TaskDetailPanel
              task={selectedTask}
              agents={agents}
              onClose={handleClosePanel}
              onUpdate={onTaskUpdate}
              className="pointer-events-auto"
            />
          )}
        </div>

        {/* Instructions overlay (bottom center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="text-gray-500 text-xs bg-[#0a0a0f]/80 px-3 py-1.5 rounded-full">
            Click agents or tasks to view details
          </div>
        </div>
      </div>
    </div>
  );
}
