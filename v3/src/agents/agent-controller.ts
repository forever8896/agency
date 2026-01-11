// Agency v3 - Agent Controller
// Manages a single Claude CLI agent process with full lifecycle control

import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { StreamParser, StreamEvent } from './stream-parser.js';
import { buildAgentContext, formatContextAsMarkdown } from './context-builder.js';
import {
  agentQueries,
  sessionQueries,
  messageQueries,
  eventQueries,
} from '../db/database.js';
import type { Message } from '../types/index.js';

// Agent controller state
export type ControllerState = 'idle' | 'starting' | 'running' | 'paused' | 'injecting' | 'stopping' | 'stopped';

// Events emitted by the controller
export interface AgentControllerEvents {
  'state:change': (from: ControllerState, to: ControllerState) => void;
  'output': (chunk: string, parsed: StreamEvent[]) => void;
  'message': (message: Message) => void;
  'tool:start': (id: string, name: string) => void;
  'tool:complete': (id: string, result: string, isError: boolean) => void;
  'error': (error: Error) => void;
  'exit': (code: number | null, signal: string | null) => void;
}

export interface AgentControllerOptions {
  agentName: string;
  agencyDir: string;
  dataDir: string;
  projectsDir: string;
  taskId?: string;
  customPrompt?: string;
}

export class AgentController extends EventEmitter {
  private state: ControllerState = 'idle';
  private ptyProcess: IPty | null = null;
  private sessionId: string | null = null;
  private claudeSessionId: string;
  private parser: StreamParser;
  private outputBuffer: string = '';
  private messageSequence: number = 0;
  private injectionQueue: string[] = [];

  readonly agentName: string;
  readonly agencyDir: string;
  readonly dataDir: string;
  readonly projectsDir: string;
  private taskId: string | null = null;

  constructor(options: AgentControllerOptions) {
    super();
    this.agentName = options.agentName;
    this.agencyDir = options.agencyDir;
    this.dataDir = options.dataDir;
    this.projectsDir = options.projectsDir;
    this.taskId = options.taskId || null;
    this.claudeSessionId = uuid();
    this.parser = new StreamParser();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start the agent with optional task ID.
   */
  async start(taskId?: string): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped') {
      throw new Error(`Cannot start agent in state: ${this.state}`);
    }

    if (taskId) {
      this.taskId = taskId;
    }

    this.setState('starting');

    // Build the prompt
    const prompt = await this.buildPrompt();

    // Create session in database
    const session = sessionQueries.create(this.agentName, this.claudeSessionId, this.taskId || undefined);
    this.sessionId = session.id;

    // Log initial prompt as first message
    this.addMessage('user', prompt);

    // Spawn Claude CLI with streaming
    // Note: --verbose is required for stream-json output in print mode
    this.spawnProcess([
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--session-id', this.claudeSessionId,
      '--dangerously-skip-permissions',
    ]);

    // Update agent status
    agentQueries.updateStatus(this.agentName, 'WORKING', this.taskId ? `Working on task ${this.taskId}` : 'Starting...');
    agentQueries.updateSession(this.agentName, this.sessionId, this.ptyProcess?.pid || null, this.taskId);

    // Log event
    eventQueries.create('agent.started', {
      agentName: this.agentName,
      sessionId: this.sessionId,
      taskId: this.taskId || undefined,
      message: `Agent ${this.agentName} started`,
    });

    this.setState('running');
  }

  /**
   * Pause the agent (SIGSTOP).
   */
  async pause(reason?: string): Promise<void> {
    if (this.state !== 'running') {
      throw new Error(`Cannot pause agent in state: ${this.state}`);
    }

    if (this.ptyProcess?.pid) {
      process.kill(this.ptyProcess.pid, 'SIGSTOP');
    }

    agentQueries.updateStatus(this.agentName, 'PAUSED', undefined, reason);
    eventQueries.create('agent.paused', {
      agentName: this.agentName,
      message: `Agent ${this.agentName} paused`,
      data: { reason },
    });

    this.setState('paused');
  }

  /**
   * Resume a paused agent (SIGCONT).
   */
  async resume(): Promise<void> {
    if (this.state !== 'paused') {
      throw new Error(`Cannot resume agent in state: ${this.state}`);
    }

    if (this.ptyProcess?.pid) {
      process.kill(this.ptyProcess.pid, 'SIGCONT');
    }

    agentQueries.updateStatus(this.agentName, 'WORKING');
    eventQueries.create('agent.resumed', {
      agentName: this.agentName,
      message: `Agent ${this.agentName} resumed`,
    });

    this.setState('running');
  }

  /**
   * Inject a message into the running agent.
   * This interrupts the current process and resumes with the new message.
   */
  async inject(message: string, injectedBy: string = 'user'): Promise<void> {
    if (this.state !== 'running' && this.state !== 'paused') {
      throw new Error(`Cannot inject message in state: ${this.state}`);
    }

    this.setState('injecting');

    // Stop current process gracefully
    if (this.ptyProcess?.pid) {
      this.ptyProcess.kill('SIGINT');
      await this.waitForExit(5000);
    }

    // Log the injection
    this.addMessage('injected', message, { injected: true, injectedBy });

    eventQueries.create('agent.injected', {
      agentName: this.agentName,
      message: `Message injected to ${this.agentName}`,
      data: { content: message.slice(0, 100) },
    });

    // Resume session with new message
    this.spawnProcess([
      '--resume', this.claudeSessionId,
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
    ]);

    // Write the message to PTY stdin
    if (this.ptyProcess) {
      this.ptyProcess.write(message + '\n');
    }

    this.setState('running');
  }

  /**
   * Redirect agent to a new task.
   */
  async redirect(newTaskId: string): Promise<void> {
    this.taskId = newTaskId;
    const message = `URGENT: Stop current work immediately. Your new priority is task ${newTaskId}. Read the task details and begin work on it now.`;
    await this.inject(message, 'orchestrator');
  }

  /**
   * Stop the agent.
   */
  async stop(): Promise<void> {
    if (this.state === 'idle' || this.state === 'stopped') {
      return;
    }

    this.setState('stopping');

    if (this.ptyProcess?.pid) {
      // Send SIGINT for graceful stop
      this.ptyProcess.kill('SIGINT');

      // Wait a bit, then force kill
      setTimeout(() => {
        if (this.ptyProcess) {
          this.ptyProcess.kill('SIGKILL');
        }
      }, 5000);

      await this.waitForExit(10000);
    }

    // Update database
    if (this.sessionId) {
      sessionQueries.updateStatus(this.sessionId, 'TERMINATED');
    }
    agentQueries.updateStatus(this.agentName, 'OFFLINE');
    agentQueries.updateSession(this.agentName, null, null, null);

    eventQueries.create('agent.stopped', {
      agentName: this.agentName,
      message: `Agent ${this.agentName} stopped`,
    });

    this.setState('stopped');
  }

  /**
   * Get current state.
   */
  getState(): ControllerState {
    return this.state;
  }

  /**
   * Get session ID.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get process ID.
   */
  getPid(): number | null {
    return this.ptyProcess?.pid || null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setState(newState: ControllerState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('state:change', oldState, newState);
  }

  private spawnProcess(args: string[]): void {
    // Use node-pty to spawn with a pseudo-TTY (required for claude CLI stream-json output)
    this.ptyProcess = pty.spawn('claude', args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: this.projectsDir,
      env: {
        ...process.env,
        AGENCY_DIR: this.agencyDir,
        DATA_DIR: this.dataDir,
        PROJECTS_DIR: this.projectsDir,
      } as { [key: string]: string },
    });

    console.log(`[${this.agentName}] PTY spawned with PID: ${this.ptyProcess.pid}`);

    // Handle data from PTY (combined stdout/stderr via TTY)
    this.ptyProcess.onData((data: string) => {
      console.log(`[${this.agentName}] PTY DATA (${data.length} bytes):`, data.slice(0, 200));
      this.outputBuffer += data;
      this.handleOutput(data);
    });

    // Handle exit
    this.ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[${this.agentName}] exited: code=${exitCode}, signal=${signal}`);

      // Flush remaining output
      const remaining = this.parser.flush();
      if (remaining.length > 0) {
        this.emit('output', '', remaining);
      }

      // Update session
      if (this.sessionId && this.state !== 'injecting') {
        sessionQueries.updateStatus(
          this.sessionId,
          exitCode === 0 ? 'COMPLETED' : 'FAILED',
          exitCode,
          signal ? `signal ${signal}` : undefined
        );
      }

      // Emit exit event
      this.emit('exit', exitCode, signal);

      // Process any queued injections
      if (this.injectionQueue.length > 0 && this.state !== 'stopping' && this.state !== 'stopped') {
        const nextMessage = this.injectionQueue.shift()!;
        this.inject(nextMessage, 'queued').catch(console.error);
      } else if (this.state !== 'stopping' && this.state !== 'stopped' && this.state !== 'injecting') {
        this.setState('idle');
        agentQueries.updateStatus(this.agentName, 'IDLE');
      }
    });
  }

  private handleOutput(data: string): void {
    const events = this.parser.parse(data);

    // Emit raw output with parsed events
    this.emit('output', data, events);

    // Process each event
    for (const event of events) {
      switch (event.type) {
        case 'content':
          // Content is streamed - we'll collect it for the message
          break;

        case 'tool_use':
          if (event.id && event.name) {
            this.emit('tool:start', event.id, event.name);
          }
          break;

        case 'tool_result':
          if (event.id) {
            this.emit('tool:complete', event.id, event.content || '', event.isError || false);
          }
          break;

        case 'message_complete':
          // Full message received - log to database
          this.addMessage('assistant', this.outputBuffer);
          this.outputBuffer = '';
          break;

        case 'error':
          this.emit('error', new Error(event.content || 'Unknown error'));
          break;
      }
    }

    // Update last activity
    if (this.sessionId) {
      agentQueries.heartbeat(this.agentName);
    }
  }

  private addMessage(
    role: Message['role'],
    content: string,
    options: { injected?: boolean; injectedBy?: string } = {}
  ): void {
    if (!this.sessionId) return;

    const message = messageQueries.create(this.sessionId, role, content, options);
    this.messageSequence++;
    this.emit('message', message);
  }

  private async buildPrompt(): Promise<string> {
    // Read agent's AGENT.md file
    const agentMdPath = join(this.agencyDir, 'agents', this.agentName, 'AGENT.md');
    let prompt: string;

    try {
      prompt = readFileSync(agentMdPath, 'utf-8');
    } catch (e) {
      throw new Error(`Could not read agent definition: ${agentMdPath}`);
    }

    // Get agent type from database
    const agentRecord = agentQueries.getByName(this.agentName);
    const agentType = agentRecord?.type || 'unknown';

    // Build rich context from project config and recent work
    const context = buildAgentContext(
      this.agentName,
      agentType,
      this.projectsDir,
      this.taskId
    );
    const contextMarkdown = formatContextAsMarkdown(context);

    // Add runtime context
    prompt += `

## Runtime Information

- **Agency Directory:** ${this.agencyDir}
- **Data Directory:** ${this.dataDir}
- **Projects Directory:** ${this.projectsDir}
- **Current Time:** ${new Date().toISOString()}
- **Session ID:** ${this.claudeSessionId}

${contextMarkdown}

## API Integration

You can interact with the Agency system via HTTP API at http://localhost:3000/api

### Key Endpoints
- GET /api/tasks?status=READY - Get available tasks
- POST /api/tasks/{id}/claim - Claim a task (body: {"agent": "${this.agentName}"})
- POST /api/tasks/{id}/complete - Complete a task (body: {"summary": "...", "files_changed": [...]})
- POST /api/agents/${this.agentName}/heartbeat - Send heartbeat

## INTERCEPTION MODE

The orchestrator can inject messages at any time. When you receive a new user message:
1. Acknowledge the interruption
2. Follow new instructions immediately
3. Do NOT continue previous work unless told to resume
`;

    // Add task-specific context if available
    if (this.taskId && context.currentTask) {
      prompt += `

## Your Assignment

You have been assigned to work on task ${this.taskId}. The task details are shown above.
Please claim this task via the API and begin work immediately.

${agentType === 'qa' ? `
### QA Notes
Review the "Recent Work" section above to understand what the developer implemented.
Check the files_changed list to know which files to test.
` : ''}
`;
    }

    return prompt;
  }

  private waitForExit(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ptyProcess) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        resolve();
      }, timeout);

      this.ptyProcess.onExit(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}
