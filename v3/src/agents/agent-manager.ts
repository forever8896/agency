// Agency v3 - Agent Manager
// Orchestrates multiple AgentController instances

import { EventEmitter } from 'events';
import { AgentController, ControllerState } from './agent-controller.js';
import { agentQueries, taskQueries, eventQueries, handoffQueries } from '../db/database.js';
import type { Agent } from '../types/index.js';

export interface AgentManagerEvents {
  'agent:started': (agentName: string) => void;
  'agent:stopped': (agentName: string) => void;
  'agent:paused': (agentName: string, reason?: string) => void;
  'agent:resumed': (agentName: string) => void;
  'agent:output': (agentName: string, chunk: string, events: unknown[]) => void;
  'agent:error': (agentName: string, error: Error) => void;
  'agent:state': (agentName: string, from: ControllerState, to: ControllerState) => void;
}

export interface AgentManagerOptions {
  agencyDir: string;
  dataDir: string;
  projectsDir: string;
  autoStart?: boolean;
}

export class AgentManager extends EventEmitter {
  private controllers: Map<string, AgentController> = new Map();
  private readonly agencyDir: string;
  private readonly dataDir: string;
  private readonly projectsDir: string;

  // Auto-orchestration
  private autoOrchestrationEnabled: boolean = false;
  private orchestrationInterval: ReturnType<typeof setInterval> | null = null;
  private orchestrationIntervalMs: number = 10000; // 10 seconds default

  constructor(options: AgentManagerOptions) {
    super();
    this.agencyDir = options.agencyDir;
    this.dataDir = options.dataDir;
    this.projectsDir = options.projectsDir;

    // Auto-start orchestration if requested
    if (options.autoStart) {
      this.enableAutoOrchestration();
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get all registered agents from database.
   */
  getAgents(): Agent[] {
    return agentQueries.getAll();
  }

  /**
   * Get a specific agent by name.
   */
  getAgent(name: string): Agent | null {
    return agentQueries.getByName(name);
  }

  /**
   * Get controller for an agent (if running).
   */
  getController(name: string): AgentController | null {
    return this.controllers.get(name) || null;
  }

  /**
   * Check if an agent is running.
   */
  isRunning(name: string): boolean {
    const controller = this.controllers.get(name);
    if (!controller) return false;
    const state = controller.getState();
    return state === 'running' || state === 'paused' || state === 'injecting';
  }

  /**
   * Start an agent with optional task assignment.
   */
  async startAgent(name: string, taskId?: string): Promise<void> {
    // Check if agent exists in database
    const agent = agentQueries.getByName(name);
    if (!agent) {
      throw new Error(`Agent not found: ${name}`);
    }

    // Check if already running
    if (this.controllers.has(name)) {
      const controller = this.controllers.get(name)!;
      const state = controller.getState();
      if (state !== 'idle' && state !== 'stopped') {
        throw new Error(`Agent ${name} is already running (state: ${state})`);
      }
    }

    // Create controller
    const controller = new AgentController({
      agentName: name,
      agencyDir: this.agencyDir,
      dataDir: this.dataDir,
      projectsDir: this.projectsDir,
      taskId,
    });

    // Wire up events
    this.wireControllerEvents(name, controller);

    // Store controller
    this.controllers.set(name, controller);

    // Start the agent
    await controller.start(taskId);

    this.emit('agent:started', name);
  }

  /**
   * Stop an agent.
   */
  async stopAgent(name: string): Promise<void> {
    const controller = this.controllers.get(name);
    if (!controller) {
      throw new Error(`Agent ${name} is not running`);
    }

    await controller.stop();
    this.controllers.delete(name);
    this.emit('agent:stopped', name);
  }

  /**
   * Pause an agent.
   */
  async pauseAgent(name: string, reason?: string): Promise<void> {
    const controller = this.controllers.get(name);
    if (!controller) {
      throw new Error(`Agent ${name} is not running`);
    }

    await controller.pause(reason);
    this.emit('agent:paused', name, reason);
  }

  /**
   * Resume a paused agent.
   */
  async resumeAgent(name: string): Promise<void> {
    const controller = this.controllers.get(name);
    if (!controller) {
      throw new Error(`Agent ${name} is not running`);
    }

    await controller.resume();
    this.emit('agent:resumed', name);
  }

  /**
   * Inject a message into a running agent.
   */
  async injectMessage(name: string, message: string, injectedBy: string = 'user'): Promise<void> {
    const controller = this.controllers.get(name);
    if (!controller) {
      throw new Error(`Agent ${name} is not running`);
    }

    await controller.inject(message, injectedBy);
  }

  /**
   * Redirect an agent to a new task.
   */
  async redirectAgent(name: string, taskId: string): Promise<void> {
    const controller = this.controllers.get(name);
    if (!controller) {
      throw new Error(`Agent ${name} is not running`);
    }

    await controller.redirect(taskId);

    eventQueries.create('agent.redirected', {
      agentName: name,
      taskId,
      message: `Agent ${name} redirected to task ${taskId}`,
    });
  }

  /**
   * Get status of all running agents.
   */
  getRunningAgents(): Array<{ name: string; state: ControllerState; pid: number | null; sessionId: string | null }> {
    const running: Array<{ name: string; state: ControllerState; pid: number | null; sessionId: string | null }> = [];

    for (const [name, controller] of this.controllers) {
      running.push({
        name,
        state: controller.getState(),
        pid: controller.getPid(),
        sessionId: controller.getSessionId(),
      });
    }

    return running;
  }

  /**
   * Stop all running agents.
   */
  async stopAll(): Promise<void> {
    // Disable auto-orchestration first
    this.disableAutoOrchestration();

    const stopPromises: Promise<void>[] = [];

    for (const [name, controller] of this.controllers) {
      stopPromises.push(
        controller.stop().catch(err => {
          console.error(`Error stopping agent ${name}:`, err);
        })
      );
    }

    await Promise.all(stopPromises);
    this.controllers.clear();

    eventQueries.create('system.shutdown', {
      message: 'All agents stopped',
    });
  }

  /**
   * Find available work and assign to idle agents.
   */
  async assignWork(): Promise<void> {
    // Get available agents (not currently running)
    const agents = agentQueries.getAll();
    const availableAgents = agents.filter(a => {
      // Agent must be idle or offline in DB (not working/blocked) and not have a running controller
      // OFFLINE means not started yet, IDLE means started but not working
      if (a.status !== 'IDLE' && a.status !== 'OFFLINE') return false;
      return !this.isRunning(a.name);
    });

    if (availableAgents.length === 0) {
      return;
    }

    // Get ready tasks
    const readyTasks = taskQueries.list({ status: 'READY', limit: availableAgents.length });

    if (readyTasks.length === 0) {
      return;
    }

    console.log(`[Orchestrator] Found ${readyTasks.length} ready tasks, ${availableAgents.length} available agents`);

    // Assign tasks to agents
    for (let i = 0; i < Math.min(availableAgents.length, readyTasks.length); i++) {
      const agent = availableAgents[i];
      const task = readyTasks[i];

      console.log(`[Orchestrator] Assigning task "${task.title}" to agent ${agent.name}`);

      try {
        // Start agent with task
        await this.startAgent(agent.name, task.id);

        eventQueries.create('orchestrator.assigned', {
          agentName: agent.name,
          taskId: task.id,
          message: `Auto-assigned task "${task.title}" to ${agent.name}`,
        });
      } catch (error) {
        console.error(`[Orchestrator] Failed to start agent ${agent.name}:`, error);
      }
    }
  }

  // ============================================================================
  // Auto-Orchestration
  // ============================================================================

  /**
   * Enable automatic orchestration.
   * Will periodically check for ready tasks and assign to idle agents.
   */
  enableAutoOrchestration(intervalMs?: number): void {
    if (this.autoOrchestrationEnabled) {
      console.log('[Orchestrator] Already enabled');
      return;
    }

    if (intervalMs) {
      this.orchestrationIntervalMs = intervalMs;
    }

    this.autoOrchestrationEnabled = true;

    // Run immediately, then on interval
    this.runOrchestrationCycle();

    this.orchestrationInterval = setInterval(() => {
      this.runOrchestrationCycle();
    }, this.orchestrationIntervalMs);

    console.log(`[Orchestrator] Enabled with ${this.orchestrationIntervalMs}ms interval`);

    eventQueries.create('orchestrator.enabled', {
      data: { intervalMs: this.orchestrationIntervalMs },
      message: 'Auto-orchestration enabled',
    });
  }

  /**
   * Disable automatic orchestration.
   */
  disableAutoOrchestration(): void {
    if (!this.autoOrchestrationEnabled) {
      console.log('[Orchestrator] Already disabled');
      return;
    }

    this.autoOrchestrationEnabled = false;

    if (this.orchestrationInterval) {
      clearInterval(this.orchestrationInterval);
      this.orchestrationInterval = null;
    }

    console.log('[Orchestrator] Disabled');

    eventQueries.create('orchestrator.disabled', {
      message: 'Auto-orchestration disabled',
    });
  }

  /**
   * Check if auto-orchestration is enabled.
   */
  isAutoOrchestrationEnabled(): boolean {
    return this.autoOrchestrationEnabled;
  }

  /**
   * Get orchestration status.
   */
  getOrchestrationStatus(): { enabled: boolean; intervalMs: number } {
    return {
      enabled: this.autoOrchestrationEnabled,
      intervalMs: this.orchestrationIntervalMs,
    };
  }

  /**
   * Run a single orchestration cycle.
   * Order of operations:
   * 1. Wake Product Owner if there are INBOX tasks to triage
   * 2. Wake agents if there are pending handoffs for them
   * 3. Assign READY tasks to idle developers
   */
  private async runOrchestrationCycle(): Promise<void> {
    try {
      // Step 1: Wake PO for INBOX triage
      await this.wakeProductOwnerForInbox();

      // Step 2: Wake agents for pending handoffs
      await this.wakeAgentsForHandoffs();

      // Step 3: Assign READY tasks to idle agents
      await this.assignWork();
    } catch (error) {
      console.error('[Orchestrator] Error in orchestration cycle:', error);
    }
  }

  /**
   * Wake Product Owner if there are INBOX tasks waiting to be triaged.
   */
  private async wakeProductOwnerForInbox(): Promise<void> {
    // Check if PO is already running
    if (this.isRunning('product-owner')) {
      return;
    }

    // Check for INBOX tasks
    const inboxTasks = taskQueries.list({ status: ['INBOX'], limit: 1 });
    if (inboxTasks.length === 0) {
      return;
    }

    // Check if PO agent exists and is available
    const po = agentQueries.getByName('product-owner');
    if (!po || (po.status !== 'IDLE' && po.status !== 'OFFLINE')) {
      return;
    }

    console.log(`[Orchestrator] Waking product-owner to triage ${inboxTasks.length}+ INBOX tasks`);

    try {
      // Start PO without a specific task - PO will read INBOX
      await this.startAgent('product-owner');

      eventQueries.create('orchestrator.wake_po', {
        agentName: 'product-owner',
        message: `Woke product-owner to triage INBOX tasks`,
        data: { inboxCount: inboxTasks.length },
      });
    } catch (error) {
      console.error('[Orchestrator] Failed to wake product-owner:', error);
    }
  }

  /**
   * Wake agents that have pending handoffs addressed to them.
   */
  private async wakeAgentsForHandoffs(): Promise<void> {
    // Get all pending handoffs
    const pendingHandoffs = handoffQueries.list({ status: 'PENDING' });

    for (const handoff of pendingHandoffs) {
      // Skip if no specific target agent
      if (!handoff.to_agent) continue;

      // Skip if target agent is already running
      if (this.isRunning(handoff.to_agent)) continue;

      // Check if agent exists and is available
      const agent = agentQueries.getByName(handoff.to_agent);
      if (!agent || (agent.status !== 'IDLE' && agent.status !== 'OFFLINE')) continue;

      console.log(`[Orchestrator] Waking ${handoff.to_agent} for handoff: ${handoff.title}`);

      try {
        // Start agent - it will see the handoff in its context
        await this.startAgent(handoff.to_agent);

        eventQueries.create('orchestrator.wake_handoff', {
          agentName: handoff.to_agent,
          handoffId: handoff.id,
          message: `Woke ${handoff.to_agent} for handoff: ${handoff.title}`,
        });
      } catch (error) {
        console.error(`[Orchestrator] Failed to wake ${handoff.to_agent}:`, error);
      }
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private wireControllerEvents(name: string, controller: AgentController): void {
    controller.on('state:change', (from, to) => {
      this.emit('agent:state', name, from, to);
    });

    controller.on('output', (chunk, events) => {
      this.emit('agent:output', name, chunk, events);
    });

    controller.on('error', (error) => {
      console.error(`[${name}] error:`, error);
      this.emit('agent:error', name, error);
    });

    controller.on('exit', (code, signal) => {
      console.log(`[${name}] exited with code=${code}, signal=${signal}`);

      // Clean up if not in injecting state
      if (controller.getState() === 'stopped' || controller.getState() === 'idle') {
        this.controllers.delete(name);
      }
    });

    controller.on('message', (message) => {
      // Broadcast message event for SSE
      eventQueries.create('agent.message', {
        agentName: name,
        sessionId: controller.getSessionId() || undefined,
        data: {
          role: message.role,
          contentPreview: message.content.slice(0, 200),
        },
      });
    });

    controller.on('tool:start', (id, toolName) => {
      eventQueries.create('agent.tool.start', {
        agentName: name,
        data: { toolId: id, toolName },
      });
    });

    controller.on('tool:complete', (id, result, isError) => {
      eventQueries.create('agent.tool.complete', {
        agentName: name,
        data: {
          toolId: id,
          isError,
          resultPreview: result.slice(0, 200),
        },
      });
    });
  }
}

// Singleton instance
let managerInstance: AgentManager | null = null;

export function getAgentManager(): AgentManager {
  if (!managerInstance) {
    throw new Error('AgentManager not initialized. Call initializeAgentManager first.');
  }
  return managerInstance;
}

export function initializeAgentManager(options: AgentManagerOptions): AgentManager {
  if (managerInstance) {
    return managerInstance;
  }
  managerInstance = new AgentManager(options);
  return managerInstance;
}

export function shutdownAgentManager(): Promise<void> {
  if (managerInstance) {
    return managerInstance.stopAll();
  }
  return Promise.resolve();
}
