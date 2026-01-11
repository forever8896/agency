import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onUpdate: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  P0: 'border-l-red-500 bg-red-500/5',
  P1: 'border-l-orange-500 bg-orange-500/5',
  P2: 'border-l-blue-500 bg-blue-500/5',
  P3: 'border-l-gray-500 bg-gray-500/5',
};

const priorityLabels: Record<string, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const priorityClass = priorityColors[task.priority] || priorityColors.P2;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border-l-4 ${priorityClass} border border-[#2a2a3a]
        hover:border-[#3a3a4a] cursor-pointer transition-colors group`}
    >
      {/* Priority and size badges */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium
            ${task.priority === 'P0' ? 'bg-red-500/20 text-red-400' :
              task.priority === 'P1' ? 'bg-orange-500/20 text-orange-400' :
              task.priority === 'P2' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'}`}
        >
          {priorityLabels[task.priority]}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-[#1a1a24] text-gray-400">
          {task.size}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-gray-200 text-sm group-hover:text-white transition-colors line-clamp-2">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        {task.assigned_to ? (
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-medium">
              {task.assigned_to.charAt(0).toUpperCase()}
            </span>
            {task.assigned_to}
          </span>
        ) : (
          <span className="text-gray-600">Unassigned</span>
        )}

        {task.acceptance_criteria.length > 0 && (
          <span className="text-gray-600">
            {task.acceptance_criteria.length} criteria
          </span>
        )}
      </div>
    </div>
  );
}
