// Office Legend - Status color legend overlay

import { STATUS_COLORS, PRIORITY_COLORS } from './constants';

interface OfficeLegendProps {
  className?: string;
}

export function OfficeLegend({ className = '' }: OfficeLegendProps) {
  const statuses = [
    { key: 'OFFLINE', label: 'Offline' },
    { key: 'IDLE', label: 'Idle' },
    { key: 'WORKING', label: 'Working' },
    { key: 'PAUSED', label: 'Paused' },
    { key: 'BLOCKED', label: 'Blocked' },
  ];

  const priorities = [
    { key: 'P0', label: 'Critical' },
    { key: 'P1', label: 'High' },
    { key: 'P2', label: 'Medium' },
    { key: 'P3', label: 'Low' },
  ];

  return (
    <div className={`absolute bottom-4 left-4 ${className}`}>
      <div className="bg-[#0a0a0f]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-3 space-y-3">
        {/* Agent Status */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5 font-medium">Agent Status</div>
          <div className="flex flex-wrap gap-2">
            {statuses.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[key as keyof typeof STATUS_COLORS] }}
                />
                <span className="text-xs text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Priority */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5 font-medium">Task Priority</div>
          <div className="flex flex-wrap gap-2">
            {priorities.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: PRIORITY_COLORS[key as keyof typeof PRIORITY_COLORS] }}
                />
                <span className="text-xs text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
