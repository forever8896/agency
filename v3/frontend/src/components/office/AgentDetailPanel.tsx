// Agent Detail Panel - Slide-in panel for agent info, controls, and live output stream

import type { Agent } from '../../types';
import type { AgentOutput } from '../../App';
import { STATUS_COLORS } from './constants';
import { startAgent, stopAgent, pauseAgent, resumeAgent, injectMessage } from '../../api';
import { useState, useRef, useEffect } from 'react';

interface AgentDetailPanelProps {
  agent: Agent;
  outputs: AgentOutput[];
  onClose: () => void;
  onAction: (action: string) => void;
  className?: string;
}

export function AgentDetailPanel({ agent, outputs, onClose, onAction, className = '' }: AgentDetailPanelProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const color = STATUS_COLORS[agent.status];

  // Auto-scroll console to bottom on new output
  useEffect(() => {
    if (consoleRef.current && showConsole) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [outputs, showConsole]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startAgent(agent.name);
      onAction('start');
    } catch (err) {
      console.error('Failed to start agent:', err);
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopAgent(agent.name);
      onAction('stop');
    } catch (err) {
      console.error('Failed to stop agent:', err);
    }
    setLoading(false);
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      await pauseAgent(agent.name);
      onAction('pause');
    } catch (err) {
      console.error('Failed to pause agent:', err);
    }
    setLoading(false);
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await resumeAgent(agent.name);
      onAction('resume');
    } catch (err) {
      console.error('Failed to resume agent:', err);
    }
    setLoading(false);
  };

  const handleInject = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await injectMessage(agent.name, message);
      setMessage('');
      onAction('inject');
    } catch (err) {
      console.error('Failed to inject message:', err);
    }
    setLoading(false);
  };

  const isRunning = agent.status === 'WORKING' || agent.status === 'PAUSED' || agent.status === 'BLOCKED';
  const isPaused = agent.status === 'PAUSED';

  return (
    <div
      className={`absolute right-0 top-0 h-full w-80 bg-[#12121a] border-l border-[#2a2a3a] overflow-y-auto ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a3a]">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h2 className="text-lg font-semibold text-white">{agent.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Status */}
      <div className="p-4 border-b border-[#2a2a3a]">
        <div className="text-sm text-gray-400 mb-1">Status</div>
        <div
          className="inline-block px-2 py-1 rounded text-sm font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {agent.status}
        </div>
      </div>

      {/* Working on */}
      {agent.working_on && (
        <div className="p-4 border-b border-[#2a2a3a]">
          <div className="text-sm text-gray-400 mb-1">Working on</div>
          <div className="text-sm text-gray-200">{agent.working_on}</div>
        </div>
      )}

      {/* Blocker */}
      {agent.blocker && (
        <div className="p-4 border-b border-[#2a2a3a]">
          <div className="text-sm text-red-400 mb-1">Blocked</div>
          <div className="text-sm text-gray-200">{agent.blocker}</div>
        </div>
      )}

      {/* Info */}
      <div className="p-4 border-b border-[#2a2a3a] space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Type</span>
          <span className="text-gray-200">{agent.type}</span>
        </div>
        {agent.pid && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">PID</span>
            <span className="text-gray-200">{agent.pid}</span>
          </div>
        )}
        {agent.session_id && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Session</span>
            <span className="text-gray-200 font-mono text-xs truncate max-w-32">
              {agent.session_id.slice(0, 8)}...
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3">
        <div className="text-sm text-gray-400 mb-2">Controls</div>

        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-2 px-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Agent'}
          </button>
        ) : (
          <div className="space-y-2">
            {isPaused ? (
              <button
                onClick={handleResume}
                disabled={loading}
                className="w-full py-2 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Resuming...' : 'Resume'}
              </button>
            ) : (
              <button
                onClick={handlePause}
                disabled={loading}
                className="w-full py-2 px-3 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Pausing...' : 'Pause'}
              </button>
            )}
            <button
              onClick={handleStop}
              disabled={loading}
              className="w-full py-2 px-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Stopping...' : 'Stop Agent'}
            </button>
          </div>
        )}
      </div>

      {/* Inject message */}
      {isRunning && (
        <div className="p-4 border-t border-[#2a2a3a]">
          <div className="text-sm text-gray-400 mb-2">Inject Message</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message to inject..."
            className="w-full h-20 px-3 py-2 text-sm bg-[#1a1a24] border border-[#2a2a3a] rounded text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleInject}
            disabled={loading || !message.trim()}
            className="mt-2 w-full py-2 px-3 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Injecting...' : 'Inject'}
          </button>
        </div>
      )}

      {/* Live Output Console */}
      <div className="flex-1 flex flex-col border-t border-[#2a2a3a] min-h-0">
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a3a] cursor-pointer hover:bg-[#1a1a24]"
          onClick={() => setShowConsole(!showConsole)}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${outputs.length > 0 && isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-sm text-gray-400">Live Output</span>
            <span className="text-xs text-gray-500">({outputs.length})</span>
          </div>
          <span className="text-gray-500 text-xs">{showConsole ? '▼' : '▶'}</span>
        </div>

        {showConsole && (
          <div
            ref={consoleRef}
            className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-[#0a0a0f] min-h-32 max-h-64"
          >
            {outputs.length === 0 ? (
              <div className="text-gray-600 text-center py-4">
                No output yet. Start the agent to see live streaming.
              </div>
            ) : (
              <div className="space-y-1">
                {outputs.slice(-50).map((output, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      output.type === 'tool' ? 'text-yellow-400' :
                      output.type === 'system' ? 'text-blue-400' :
                      'text-gray-300'
                    }`}
                  >
                    {formatOutputContent(output.content)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Format output content for display
function formatOutputContent(content: string): string {
  // Trim very long outputs
  if (content.length > 500) {
    return content.slice(0, 500) + '...';
  }
  return content.trim();
}
