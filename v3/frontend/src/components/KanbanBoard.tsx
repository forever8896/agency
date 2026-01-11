import type { Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
}

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'INBOX', label: 'Inbox', color: 'border-gray-500' },
  { status: 'READY', label: 'Ready', color: 'border-blue-500' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-yellow-500' },
  { status: 'DONE', label: 'Done', color: 'border-green-500' },
  { status: 'QA_TESTING', label: 'QA Testing', color: 'border-purple-500' },
  { status: 'SHIPPED', label: 'Shipped', color: 'border-emerald-500' },
];

export function KanbanBoard({ tasks, onTaskClick, onTaskUpdate }: KanbanBoardProps) {
  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter(t => t.status === status);

  return (
    <div className="flex gap-4 h-full min-w-max">
      {COLUMNS.map(column => {
        const columnTasks = getTasksByStatus(column.status);
        return (
          <div
            key={column.status}
            className={`flex flex-col w-72 bg-[#12121a] rounded-lg border-t-2 ${column.color}`}
          >
            {/* Column header */}
            <div className="px-3 py-2 border-b border-[#2a2a3a] flex items-center justify-between">
              <h3 className="font-medium text-gray-200">{column.label}</h3>
              <span className="text-sm text-gray-500 bg-[#1a1a24] px-2 py-0.5 rounded">
                {columnTasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {columnTasks.length === 0 ? (
                <div className="text-center text-gray-600 py-8 text-sm">
                  No tasks
                </div>
              ) : (
                columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    onUpdate={onTaskUpdate}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
