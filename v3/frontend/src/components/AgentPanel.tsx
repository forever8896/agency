import { useState } from 'react';
import type { Agent } from '../types';
import { startAgent, stopAgent, pauseAgent, resumeAgent, injectMessage } from '../api';

interface AgentPanelProps {
  agents: Agent[];
  onAgentUpdate: () => void;
}

const statusColors: Record<string, string> = {
  OFFLINE: 'bg-gray-500',
  IDLE: 'bg-green-500',
  WORKING: 'bg-yellow-500',
  PAUSED: 'bg-orange-500',
  BLOCKED: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  OFFLINE: 'Offline',
  IDLE: 'Idle',
  WORKING: 'Working',
  PAUSED: 'Paused',
  BLOCKED: 'Blocked',
};

export function AgentPanel({ agents, onAgentUpdate }: AgentPanelProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [injectionText, setInjectionText] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: 'start' | 'stop' | 'pause' | 'resume', agentName: string) => {
    setLoading(agentName);
    try {
      switch (action) {
        case 'start':
          await startAgent(agentName);
          break;
        case 'stop':
          await stopAgent(agentName);
          break;
        case 'pause':
          await pauseAgent(agentName);
          break;
        case 'resume':
          await resumeAgent(agentName);
          break;
      }
      onAgentUpdate();
    } catch (err) {
      console.error(`Failed to ${action} agent:`, err);
    } finally {
      setLoading(null);
    }
  };

  const handleInject = async (agentName: string) => {
    if (!injectionText.trim()) return;

    setLoading(agentName);
    try {
      await injectMessage(agentName, injectionText);
      setInjectionText('');
      onAgentUpdate();
    } catch (err) {
      console.error('Failed to inject message:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-80 bg-[#12121a] border-l border-[#2a2a3a] flex flex-col">
      <div className="px-4 py-3 border-b border-[#2a2a3a]">
        <h2 className="font-semibold text-gray-200 flex items-center gap-2">
          <span>🤖</span> Agents
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map(agent => {
          const isExpanded = expandedAgent === agent.name;
          const isLoading = loading === agent.name;

          return (
            <div
              key={agent.name}
              className="bg-[#1a1a24] rounded-lg border border-[#2a2a3a] overflow-hidden"
            >
              {/* Agent header */}
              <div
                onClick={() => setExpandedAgent(isExpanded ? null : agent.name)}
                className="px-3 py-2 cursor-pointer hover:bg-[#222230] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                  <span className="font-medium text-gray-200 text-sm">{agent.name}</span>
                </div>
                <span className="text-xs text-gray-500">{statusLabels[agent.status]}</span>
              </div>

              {/* Expanded controls */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-[#2a2a3a]">
                  <div className="text-xs text-gray-500 mb-2">
                    Type: {agent.type} • {agent.specialization}
                  </div>

                  {agent.working_on && (
                    <div className="text-xs text-gray-400 mb-2 bg-[#12121a] p-2 rounded">
                      📝 {agent.working_on}
                    </div>
                  )}

                  {/* Control buttons */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {agent.status === 'OFFLINE' && (
                      <button
                        onClick={() => handleAction('start', agent.name)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                      >
                        ▶ Start
                      </button>
                    )}

                    {agent.status === 'WORKING' && (
                      <>
                        <button
                          onClick={() => handleAction('pause', agent.name)}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded disabled:opacity-50"
                        >
                          ⏸ Pause
                        </button>
                        <button
                          onClick={() => handleAction('stop', agent.name)}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                        >
                          ⏹ Stop
                        </button>
                      </>
                    )}

                    {agent.status === 'PAUSED' && (
                      <>
                        <button
                          onClick={() => handleAction('resume', agent.name)}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                        >
                          ▶ Resume
                        </button>
                        <button
                          onClick={() => handleAction('stop', agent.name)}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                        >
                          ⏹ Stop
                        </button>
                      </>
                    )}

                    {agent.status === 'IDLE' && (
                      <button
                        onClick={() => handleAction('stop', agent.name)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50"
                      >
                        ⏹ Stop
                      </button>
                    )}
                  </div>

                  {/* Message injection */}
                  {(agent.status === 'WORKING' || agent.status === 'PAUSED') && (
                    <div className="mt-2">
                      <textarea
                        value={injectionText}
                        onChange={(e) => setInjectionText(e.target.value)}
                        placeholder="Inject message..."
                        className="w-full px-2 py-1.5 text-xs bg-[#0a0a0f] border border-[#2a2a3a] rounded text-gray-200 placeholder-gray-600 resize-none"
                        rows={2}
                      />
                      <button
                        onClick={() => handleInject(agent.name)}
                        disabled={isLoading || !injectionText.trim()}
                        className="mt-1 w-full px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                      >
                        💉 Inject Message
                      </button>
                    </div>
                  )}

                  {agent.pid && (
                    <div className="text-xs text-gray-600 mt-2">
                      PID: {agent.pid}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
