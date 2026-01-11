// Task Detail Panel - Slide-in panel for task info and actions

import { useState } from 'react';
import type { Agent, Task } from '../../types';
import { PRIORITY_COLORS } from './constants';
import { updateTaskStatus, claimTask } from '../../api';

interface TaskDetailPanelProps {
  task: Task;
  agents: Agent[];
  onClose: () => void;
  onUpdate: (task: Task) => void;
  className?: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  INBOX: ['READY'],
  READY: ['IN_PROGRESS'],
  IN_PROGRESS: ['QA_TESTING', 'REVIEWING', 'DONE'],
  QA_TESTING: ['QA_PASSED', 'QA_FAILED'],
  QA_PASSED: ['REVIEWING', 'DONE'],
  QA_FAILED: ['IN_PROGRESS'],
  REVIEWING: ['REVIEWED', 'IN_PROGRESS'],
  REVIEWED: ['DONE', 'SHIPPED'],
  DONE: ['SHIPPED'],
  SHIPPED: [],
};

export function TaskDetailPanel({ task, agents, onClose, onUpdate, className = '' }: TaskDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const color = PRIORITY_COLORS[task.priority];
  const possibleTransitions = STATUS_TRANSITIONS[task.status] || [];
  const idleAgents = agents.filter((a) => a.status === 'IDLE' || a.status === 'OFFLINE');

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const updated = await updateTaskStatus(task.id, newStatus);
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
    setLoading(false);
  };

  const handleAssign = async (agentName: string) => {
    setLoading(true);
    try {
      const updated = await claimTask(task.id, agentName);
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to assign task:', err);
    }
    setLoading(false);
  };

  return (
    <div
      className={`absolute right-0 top-0 h-full w-96 bg-[#12121a] border-l border-[#2a2a3a] overflow-y-auto ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[#2a2a3a]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {task.priority}
            </span>
            <span className="text-xs text-gray-400">{task.size}</span>
          </div>
          <h2 className="text-lg font-semibold text-white leading-tight">{task.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none ml-2"
        >
          &times;
        </button>
      </div>

      {/* Status */}
      <div className="p-4 border-b border-[#2a2a3a]">
        <div className="text-sm text-gray-400 mb-2">Status</div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded text-sm font-medium bg-[#1a1a24] text-white border border-[#2a2a3a]">
            {task.status}
          </span>
          {possibleTransitions.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={loading}
              className="px-2 py-1 rounded text-sm text-gray-300 hover:text-white hover:bg-[#2a2a3a] border border-[#2a2a3a] transition-colors disabled:opacity-50"
            >
              &rarr; {status}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment */}
      <div className="p-4 border-b border-[#2a2a3a]">
        <div className="text-sm text-gray-400 mb-2">Assigned to</div>
        {task.assigned_to ? (
          <div className="text-white">{task.assigned_to}</div>
        ) : (
          <div className="space-y-2">
            <div className="text-gray-500 text-sm">Not assigned</div>
            {task.status === 'READY' && idleAgents.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {idleAgents.slice(0, 4).map((agent) => (
                  <button
                    key={agent.name}
                    onClick={() => handleAssign(agent.name)}
                    disabled={loading}
                    className="px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <div className="p-4 border-b border-[#2a2a3a]">
          <div className="text-sm text-gray-400 mb-2">Description</div>
          <div className="text-sm text-gray-200 whitespace-pre-wrap">{task.description}</div>
        </div>
      )}

      {/* Acceptance Criteria */}
      {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
        <div className="p-4 border-b border-[#2a2a3a]">
          <div className="text-sm text-gray-400 mb-2">Acceptance Criteria</div>
          <ul className="space-y-1">
            {task.acceptance_criteria.map((criterion, i) => (
              <li key={i} className="text-sm text-gray-200 flex items-start gap-2">
                <span className="text-gray-500">-</span>
                {criterion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {task.summary && (
        <div className="p-4 border-b border-[#2a2a3a]">
          <div className="text-sm text-gray-400 mb-2">Summary</div>
          <div className="text-sm text-gray-200 whitespace-pre-wrap">{task.summary}</div>
        </div>
      )}

      {/* Metadata */}
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">ID</span>
          <span className="text-gray-200 font-mono text-xs">{task.id.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Created</span>
          <span className="text-gray-200">
            {new Date(task.created_at).toLocaleDateString()}
          </span>
        </div>
        {task.completed_at && (
          <div className="flex justify-between">
            <span className="text-gray-400">Completed</span>
            <span className="text-gray-200">
              {new Date(task.completed_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
