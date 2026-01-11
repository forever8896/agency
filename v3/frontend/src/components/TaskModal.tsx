import { useState } from 'react';
import type { Task, Agent, TaskStatus } from '../types';
import { updateTask, updateTaskStatus, claimTask, completeTask } from '../api';

interface TaskModalProps {
  task: Task;
  agents: Agent[];
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

const STATUS_TRANSITIONS: Record<TaskStatus, { label: string; next: TaskStatus; action: string }[]> = {
  INBOX: [{ label: 'Move to Ready', next: 'READY', action: 'Ready for work' }],
  READY: [{ label: 'Start Work', next: 'IN_PROGRESS', action: 'claim' }],
  IN_PROGRESS: [{ label: 'Mark Done', next: 'DONE', action: 'complete' }],
  DONE: [{ label: 'Start QA', next: 'QA_TESTING', action: 'status' }],
  QA_TESTING: [
    { label: 'Pass QA', next: 'QA_PASSED', action: 'status' },
    { label: 'Fail QA', next: 'QA_FAILED', action: 'status' },
  ],
  QA_PASSED: [{ label: 'Ship It!', next: 'SHIPPED', action: 'status' }],
  QA_FAILED: [{ label: 'Back to Work', next: 'IN_PROGRESS', action: 'status' }],
  REVIEWING: [],
  REVIEWED: [],
  SHIPPED: [],
};

export function TaskModal({ task, agents, onClose, onUpdate }: TaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [assignTo, setAssignTo] = useState(task.assigned_to || '');

  const handleStatusChange = async (nextStatus: TaskStatus, action: string) => {
    setLoading(true);
    try {
      let updatedTask: Task;

      if (action === 'claim' && assignTo) {
        updatedTask = await claimTask(task.id, assignTo);
      } else if (action === 'complete') {
        updatedTask = await completeTask(task.id);
      } else {
        updatedTask = await updateTaskStatus(task.id, nextStatus);
      }

      onUpdate(updatedTask);
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTo) return;
    setLoading(true);
    try {
      const updatedTask = await updateTask(task.id, { assigned_to: assignTo });
      onUpdate(updatedTask);
    } catch (err) {
      console.error('Failed to assign task:', err);
    } finally {
      setLoading(false);
    }
  };

  const transitions = STATUS_TRANSITIONS[task.status] || [];
  const availableAgents = agents.filter(a => a.status !== 'OFFLINE');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#12121a] border border-[#2a2a3a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2a3a] flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium
                  ${task.priority === 'P0' ? 'bg-red-500/20 text-red-400' :
                    task.priority === 'P1' ? 'bg-orange-500/20 text-orange-400' :
                    task.priority === 'P2' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'}`}
              >
                {task.priority}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#1a1a24] text-gray-400">
                {task.size}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#1a1a24] text-gray-400">
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl px-2"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Description */}
          {task.description && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
              <p className="text-gray-200 text-sm">{task.description}</p>
            </div>
          )}

          {/* Value Statement */}
          {task.value_statement && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Value Statement</h3>
              <p className="text-gray-200 text-sm">{task.value_statement}</p>
            </div>
          )}

          {/* Acceptance Criteria */}
          {task.acceptance_criteria.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Acceptance Criteria</h3>
              <ul className="space-y-1">
                {task.acceptance_criteria.map((criteria, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className="text-gray-500">•</span>
                    {criteria}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Assignment */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Assignment</h3>
            <div className="flex items-center gap-2">
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-gray-200"
              >
                <option value="">Unassigned</option>
                {availableAgents.map(agent => (
                  <option key={agent.name} value={agent.name}>
                    {agent.name} ({agent.status})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={loading || assignTo === task.assigned_to}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>

          {/* Files Changed */}
          {task.files_changed.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Files Changed</h3>
              <div className="bg-[#0a0a0f] rounded p-2 text-xs font-mono text-gray-300">
                {task.files_changed.map((file, i) => (
                  <div key={i}>{file}</div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {task.summary && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Summary</h3>
              <p className="text-gray-200 text-sm">{task.summary}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 border-t border-[#2a2a3a] pt-4 mt-4">
            <div>ID: {task.id}</div>
            <div>Created: {new Date(task.created_at).toLocaleString()}</div>
            {task.completed_at && (
              <div>Completed: {new Date(task.completed_at).toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        {transitions.length > 0 && (
          <div className="px-6 py-4 border-t border-[#2a2a3a] flex justify-end gap-2">
            {transitions.map(transition => (
              <button
                key={transition.next}
                onClick={() => handleStatusChange(transition.next, transition.action)}
                disabled={loading || (transition.action === 'claim' && !assignTo)}
                className={`px-4 py-2 text-sm font-medium rounded disabled:opacity-50
                  ${transition.next === 'SHIPPED' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    transition.label.includes('Fail') ? 'bg-red-600 hover:bg-red-700 text-white' :
                    'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {loading ? '...' : transition.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
