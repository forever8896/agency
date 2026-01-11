// Communication Dock - Collapsible panel showing Inbox, Backlog, and Handoffs

import { useState } from 'react';
import type { Task, Handoff } from '../../types';

interface CommunicationDockProps {
  tasks: Task[];
  handoffs: Handoff[];
  onTaskClick: (task: Task) => void;
  className?: string;
}

type TabType = 'inbox' | 'backlog' | 'active' | 'handoffs';

export function CommunicationDock({ tasks, handoffs, onTaskClick, className = '' }: CommunicationDockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  // Filter tasks by status
  const inboxTasks = tasks.filter(t => t.status === 'INBOX');
  const backlogTasks = tasks.filter(t => t.status === 'READY');
  // Active = IN_PROGRESS, DONE, QA_TESTING, REVIEWING (work in flight)
  const activeTasks = tasks.filter(t =>
    ['IN_PROGRESS', 'DONE', 'QA_TESTING', 'QA_PASSED', 'REVIEWING', 'REVIEWED'].includes(t.status)
  );
  const pendingHandoffs = handoffs.filter(h => h.status === 'PENDING' || h.status === 'CLAIMED');

  const tabs: { id: TabType; label: string; count: number; color: string }[] = [
    { id: 'active', label: 'Active', count: activeTasks.length, color: 'bg-green-500' },
    { id: 'backlog', label: 'Backlog', count: backlogTasks.length, color: 'bg-blue-500' },
    { id: 'inbox', label: 'Inbox', count: inboxTasks.length, color: 'bg-purple-500' },
    { id: 'handoffs', label: 'Handoffs', count: pendingHandoffs.length, color: 'bg-orange-500' },
  ];

  return (
    <div className={`absolute left-4 top-20 ${className}`}>
      <div className="bg-[#12121a]/95 backdrop-blur-sm border border-[#2a2a3a] rounded-lg overflow-hidden shadow-xl" style={{ width: isExpanded ? '360px' : '48px' }}>
        {/* Header / Toggle */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a3a] cursor-pointer hover:bg-[#1a1a24]"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span className="text-sm font-medium text-gray-200">Communications</span>
              </div>
              <span className="text-gray-500 text-xs">◀</span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 py-1">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              {(inboxTasks.length + backlogTasks.length + pendingHandoffs.length) > 0 && (
                <span className="text-xs font-medium text-white bg-blue-500 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {inboxTasks.length + backlogTasks.length + pendingHandoffs.length}
                </span>
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-[#2a2a3a]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-white border-b-2 border-blue-500 bg-[#1a1a24]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a24]/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`ml-1.5 ${tab.color} text-white text-[10px] rounded-full px-1.5 py-0.5`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {activeTab === 'active' && (
                <ActivePanel tasks={activeTasks} onTaskClick={onTaskClick} />
              )}
              {activeTab === 'inbox' && (
                <InboxPanel tasks={inboxTasks} onTaskClick={onTaskClick} />
              )}
              {activeTab === 'backlog' && (
                <BacklogPanel tasks={backlogTasks} onTaskClick={onTaskClick} />
              )}
              {activeTab === 'handoffs' && (
                <HandoffsPanel handoffs={pendingHandoffs} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Active Panel - Shows tasks in progress with assignments
function ActivePanel({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (task: Task) => void }) {
  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="mb-2">🔄</div>
        No active work
      </div>
    );
  }

  // Group by status for clear workflow visualization
  const byStatus: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!byStatus[task.status]) byStatus[task.status] = [];
    byStatus[task.status].push(task);
  }

  const statusOrder = ['IN_PROGRESS', 'DONE', 'QA_TESTING', 'QA_PASSED', 'REVIEWING', 'REVIEWED'];
  const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
    'IN_PROGRESS': { label: 'In Progress', color: 'bg-blue-500', icon: '🔨' },
    'DONE': { label: 'Dev Complete', color: 'bg-green-500', icon: '✅' },
    'QA_TESTING': { label: 'QA Testing', color: 'bg-yellow-500', icon: '🧪' },
    'QA_PASSED': { label: 'QA Passed', color: 'bg-emerald-500', icon: '✓' },
    'REVIEWING': { label: 'In Review', color: 'bg-purple-500', icon: '👁' },
    'REVIEWED': { label: 'Reviewed', color: 'bg-indigo-500', icon: '✓✓' },
  };

  return (
    <div className="p-2 space-y-3">
      {statusOrder.map(status => {
        const statusTasks = byStatus[status] || [];
        if (statusTasks.length === 0) return null;

        const info = statusLabels[status] || { label: status, color: 'bg-gray-500', icon: '•' };

        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className={`w-2 h-2 rounded-full ${info.color}`} />
              <span className="text-xs font-medium text-gray-400">{info.label}</span>
              <span className="text-xs text-gray-600">({statusTasks.length})</span>
            </div>
            <div className="space-y-1.5">
              {statusTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="p-2 rounded bg-[#1a1a24] hover:bg-[#252532] cursor-pointer border border-[#2a2a3a] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.assigned_to && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                        {task.assigned_to}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-200 line-clamp-1">
                    {task.title}
                  </div>
                  {task.summary && (
                    <div className="text-xs text-gray-500 line-clamp-1 mt-1">
                      {task.summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Inbox Panel - Shows INBOX tasks (untriaged)
function InboxPanel({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (task: Task) => void }) {
  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="mb-2">📬</div>
        Inbox is empty
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {tasks.map(task => (
        <div
          key={task.id}
          onClick={() => onTaskClick(task)}
          className="p-2 rounded bg-[#1a1a24] hover:bg-[#252532] cursor-pointer border border-[#2a2a3a] transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(task.created_at)}
            </span>
          </div>
          <div className="text-sm text-gray-200 line-clamp-2">
            {task.title}
          </div>
        </div>
      ))}
    </div>
  );
}

// Backlog Panel - Shows READY tasks (triaged, awaiting assignment)
function BacklogPanel({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (task: Task) => void }) {
  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="mb-2">📋</div>
        Backlog is empty
      </div>
    );
  }

  // Sort by priority (P0 first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="p-2 space-y-2">
      {sortedTasks.map(task => (
        <div
          key={task.id}
          onClick={() => onTaskClick(task)}
          className="p-2 rounded bg-[#1a1a24] hover:bg-[#252532] cursor-pointer border border-[#2a2a3a] transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${getSizeColor(task.size)}`}>
                {task.size}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(task.created_at)}
            </span>
          </div>
          <div className="text-sm text-gray-200 line-clamp-2">
            {task.title}
          </div>
        </div>
      ))}
    </div>
  );
}

// Handoffs Panel - Shows pending inter-agent handoffs
function HandoffsPanel({ handoffs }: { handoffs: Handoff[] }) {
  if (handoffs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="mb-2">🤝</div>
        No pending handoffs
      </div>
    );
  }

  // Sort by priority (urgent first)
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedHandoffs = [...handoffs].sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return (
    <div className="p-2 space-y-2">
      {sortedHandoffs.map(handoff => (
        <div
          key={handoff.id}
          className="p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getHandoffTypeColor(handoff.type)}`}>
                {handoff.type}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${getHandoffPriorityColor(handoff.priority)}`}>
                {handoff.priority}
              </span>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              handoff.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {handoff.status}
            </span>
          </div>

          <div className="text-sm font-medium text-gray-200 mb-1">
            {handoff.title}
          </div>

          <div className="text-xs text-gray-400 line-clamp-2 mb-2">
            {handoff.content}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {handoff.from_agent} → {handoff.to_agent || 'Any'}
            </span>
            <span>{formatTimeAgo(handoff.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper functions
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'P0': return 'bg-red-500/20 text-red-400';
    case 'P1': return 'bg-orange-500/20 text-orange-400';
    case 'P2': return 'bg-yellow-500/20 text-yellow-400';
    case 'P3': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function getSizeColor(size: string): string {
  switch (size) {
    case 'S': return 'bg-green-500/20 text-green-400';
    case 'M': return 'bg-blue-500/20 text-blue-400';
    case 'L': return 'bg-purple-500/20 text-purple-400';
    case 'XL': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function getHandoffTypeColor(type: string): string {
  switch (type) {
    case 'bug-report': return 'bg-red-500/20 text-red-400';
    case 'blocker': return 'bg-red-600/20 text-red-300';
    case 'clarification': return 'bg-yellow-500/20 text-yellow-400';
    case 'design-doc': return 'bg-purple-500/20 text-purple-400';
    case 'review-request': return 'bg-blue-500/20 text-blue-400';
    case 'task-handoff': return 'bg-green-500/20 text-green-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function getHandoffPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'bg-red-500/20 text-red-400';
    case 'high': return 'bg-orange-500/20 text-orange-400';
    case 'normal': return 'bg-gray-500/20 text-gray-400';
    case 'low': return 'bg-gray-600/20 text-gray-500';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
