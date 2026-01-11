import { useState } from 'react';
import type { Task, Priority } from '../types';
import { createTask } from '../api';

interface CreateTaskModalProps {
  onClose: () => void;
  onCreate: (task: Task) => void;
}

export function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('P2');
  const [criteriaText, setCriteriaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse criteria from textarea (one per line)
      const acceptance_criteria = criteriaText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const task = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        acceptance_criteria: acceptance_criteria.length > 0 ? acceptance_criteria : undefined,
      });

      onCreate(task);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#12121a] border border-[#2a2a3a] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2a3a] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl px-2"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 p-2 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-gray-200 placeholder-gray-600 resize-none focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Priority */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Priority
            </label>
            <div className="flex gap-2">
              {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors
                    ${priority === p
                      ? p === 'P0' ? 'bg-red-600 text-white' :
                        p === 'P1' ? 'bg-orange-600 text-white' :
                        p === 'P2' ? 'bg-blue-600 text-white' :
                        'bg-gray-600 text-white'
                      : 'bg-[#1a1a24] text-gray-400 hover:bg-[#2a2a3a]'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Acceptance Criteria
              <span className="text-gray-600 font-normal ml-1">(one per line)</span>
            </label>
            <textarea
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              placeholder="Feature should do X&#10;User can see Y&#10;System handles Z"
              rows={4}
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-gray-200 placeholder-gray-600 resize-none focus:border-blue-500 focus:outline-none font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
