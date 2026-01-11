// Agent Console - Shows streaming output from agents

import { useRef, useEffect } from 'react';

interface AgentOutput {
  agent: string;
  content: string;
  timestamp: number;
}

interface AgentConsoleProps {
  outputs: AgentOutput[];
  className?: string;
}

export function AgentConsole({ outputs, className = '' }: AgentConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  if (outputs.length === 0) {
    return null;
  }

  // Group by agent and get latest for each
  const latestByAgent = new Map<string, AgentOutput>();
  for (const output of outputs.slice(-50)) {
    latestByAgent.set(output.agent, output);
  }

  return (
    <div className={`absolute bottom-20 right-4 w-96 max-h-64 ${className}`}>
      <div className="bg-[#0a0a0f]/95 backdrop-blur-sm border border-[#2a2a3a] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-[#2a2a3a] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-gray-300">Agent Activity</span>
        </div>

        {/* Output stream */}
        <div
          ref={scrollRef}
          className="max-h-48 overflow-y-auto p-2 space-y-2 font-mono text-xs"
        >
          {outputs.slice(-20).map((output, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-blue-400 shrink-0">[{output.agent}]</span>
              <span className="text-gray-300 whitespace-pre-wrap break-all">
                {formatOutput(output.content)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Format output to be more readable
function formatOutput(content: string): string {
  // Trim very long outputs
  if (content.length > 200) {
    return content.slice(0, 200) + '...';
  }
  return content.trim();
}

// Compact version that shows as speech bubble above agent
interface AgentBubbleProps {
  agentName: string;
  content: string;
  className?: string;
}

export function AgentBubble({ agentName: _agentName, content, className = '' }: AgentBubbleProps) {
  if (!content) return null;

  return (
    <div className={`max-w-48 ${className}`}>
      <div
        className="px-2 py-1 rounded-lg text-xs bg-[#1a1a24]/95 border border-[#3a3a4a] text-gray-200"
        style={{ wordBreak: 'break-word' }}
      >
        {formatOutput(content)}
      </div>
      {/* Triangle pointer */}
      <div
        className="w-0 h-0 mx-auto"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #3a3a4a',
        }}
      />
    </div>
  );
}
