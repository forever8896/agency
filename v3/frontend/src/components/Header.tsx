import { useState, useEffect } from 'react';
import type { DashboardSummary } from '../types';
import { getOrchestrationStatus, enableOrchestration, disableOrchestration, runOrchestrationCycle } from '../api';

interface HeaderProps {
  summary: DashboardSummary | null;
  connected: boolean;
  onCreateTask: () => void;
  onRefresh: () => void;
}

export function Header({ summary, connected, onCreateTask, onRefresh }: HeaderProps) {
  const [orchestrationEnabled, setOrchestrationEnabled] = useState(false);
  const [orchestrationLoading, setOrchestrationLoading] = useState(false);

  // Fetch orchestration status on mount
  useEffect(() => {
    getOrchestrationStatus()
      .then((status) => setOrchestrationEnabled(status.enabled))
      .catch((err) => console.error('Failed to get orchestration status:', err));
  }, []);

  const toggleOrchestration = async () => {
    setOrchestrationLoading(true);
    try {
      if (orchestrationEnabled) {
        await disableOrchestration();
        setOrchestrationEnabled(false);
      } else {
        await enableOrchestration();
        setOrchestrationEnabled(true);
      }
    } catch (err) {
      console.error('Failed to toggle orchestration:', err);
    }
    setOrchestrationLoading(false);
  };

  const triggerOrchestration = async () => {
    try {
      await runOrchestrationCycle();
    } catch (err) {
      console.error('Failed to run orchestration cycle:', err);
    }
  };

  return (
    <header className="bg-[#12121a] border-b border-[#2a2a3a] px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🏢</span>
          Agency v3
        </h1>

        {/* Connection status */}
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-gray-400">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Orchestration toggle */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={toggleOrchestration}
            disabled={orchestrationLoading}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
              orchestrationEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } ${orchestrationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`w-2 h-2 rounded-full ${orchestrationEnabled ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
            {orchestrationLoading ? 'Loading...' : orchestrationEnabled ? 'Auto ON' : 'Auto OFF'}
          </button>
          <button
            onClick={triggerOrchestration}
            title="Run one orchestration cycle"
            className="px-2 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-[#2a2a3a] rounded transition-colors"
          >
            ⚡
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Inbox:</span>
            <span className="font-medium text-gray-300">{summary.tasks.inbox}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Ready:</span>
            <span className="font-medium text-blue-400">{summary.tasks.ready}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">In Progress:</span>
            <span className="font-medium text-yellow-400">{summary.tasks.in_progress}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Agents:</span>
            <span className="font-medium text-green-400">
              {summary.agents.working}/{summary.agents.online}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-[#2a2a3a] rounded transition-colors"
        >
          ↻ Refresh
        </button>
        <button
          onClick={onCreateTask}
          className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + New Task
        </button>
      </div>
    </header>
  );
}
