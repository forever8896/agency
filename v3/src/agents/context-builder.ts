// Agency v3 - Context Builder
// Builds rich context for agents based on project config and task history

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { taskQueries, handoffQueries } from '../db/database.js';
import type { Task, Handoff } from '../types/index.js';

// Project configuration schema
export interface ProjectConfig {
  name: string;
  description: string;
  rootPath: string;
  techStack: string[];
  keyDirectories: {
    src?: string;
    contracts?: string;
    frontend?: string;
    backend?: string;
    tests?: string;
    docs?: string;
  };
  currentFocus?: string;
  notes?: string[];
}

// Context passed to agents
export interface AgentContext {
  project: ProjectConfig | null;
  currentTask: Task | null;
  recentWork: {
    task: Task;
    summary: string | null;
    filesChanged: string[];
  }[];
  pendingHandoffs: Handoff[];
  workflowPosition: string;
}

/**
 * Try to load project config from a directory
 */
export function loadProjectConfig(projectsDir: string): ProjectConfig | null {
  // Try multiple config file names
  const configNames = [
    'agency-project.json',
    'agency.json',
    '.agency/project.json',
  ];

  for (const configName of configNames) {
    const configPath = join(projectsDir, configName);
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as ProjectConfig;
        config.rootPath = projectsDir;
        return config;
      } catch (e) {
        console.error(`Failed to parse ${configPath}:`, e);
      }
    }
  }

  // No config found - create a minimal one from directory inspection
  return {
    name: projectsDir.split('/').pop() || 'Unknown Project',
    description: 'No agency-project.json found. Create one for better context.',
    rootPath: projectsDir,
    techStack: [],
    keyDirectories: {},
  };
}

/**
 * Get recent completed work for context
 */
function getRecentWork(limit: number = 5): AgentContext['recentWork'] {
  // Get recently completed tasks (DONE, QA_PASSED, SHIPPED)
  const recentTasks = taskQueries.list({
    status: ['DONE', 'QA_PASSED', 'QA_TESTING', 'REVIEWED', 'SHIPPED'],
    limit,
  });

  return recentTasks.map(task => ({
    task,
    summary: task.summary,
    filesChanged: task.files_changed || [],
  }));
}

/**
 * Determine workflow position description
 */
function getWorkflowPosition(task: Task | null, agentType: string): string {
  if (!task) {
    return `You are the ${agentType}. Check for work appropriate to your role.`;
  }

  const positions: Record<string, string> = {
    'INBOX': 'This task is new and needs to be triaged into actionable work.',
    'READY': 'This task is ready for development. Claim it and implement the requirements.',
    'IN_PROGRESS': 'This task is being worked on. Continue or complete the implementation.',
    'DONE': 'Development is complete. This task needs QA testing.',
    'QA_TESTING': 'QA is actively testing this task.',
    'QA_PASSED': 'QA has verified this task. It may need code review or can be shipped.',
    'QA_FAILED': 'QA found issues. Review the feedback and fix the problems.',
    'REVIEWING': 'This task is under code review.',
    'REVIEWED': 'Code review passed. This task is ready to ship.',
    'SHIPPED': 'This task has been deployed to production.',
  };

  return positions[task.status] || `Task is in ${task.status} status.`;
}

/**
 * Build full context for an agent
 */
export function buildAgentContext(
  agentName: string,
  agentType: string,
  projectsDir: string,
  taskId: string | null
): AgentContext {
  const project = loadProjectConfig(projectsDir);
  const currentTask = taskId ? taskQueries.getById(taskId) : null;
  const recentWork = getRecentWork(5);
  const pendingHandoffs = handoffQueries.list({
    toAgent: agentName,
    status: 'PENDING',
  });
  const workflowPosition = getWorkflowPosition(currentTask, agentType);

  return {
    project,
    currentTask,
    recentWork,
    pendingHandoffs,
    workflowPosition,
  };
}

/**
 * Format context as markdown for agent prompt
 */
export function formatContextAsMarkdown(context: AgentContext): string {
  const sections: string[] = [];

  // Project info
  if (context.project) {
    sections.push(`## Project: ${context.project.name}

${context.project.description}

**Root Path:** \`${context.project.rootPath}\`
${context.project.techStack.length > 0 ? `**Tech Stack:** ${context.project.techStack.join(', ')}` : ''}
${context.project.currentFocus ? `**Current Focus:** ${context.project.currentFocus}` : ''}
`);

    if (Object.keys(context.project.keyDirectories).length > 0) {
      sections.push(`### Key Directories
${Object.entries(context.project.keyDirectories)
  .map(([key, path]) => `- **${key}:** \`${path}\``)
  .join('\n')}
`);
    }

    if (context.project.notes && context.project.notes.length > 0) {
      sections.push(`### Notes
${context.project.notes.map(n => `- ${n}`).join('\n')}
`);
    }
  }

  // Current task
  if (context.currentTask) {
    const task = context.currentTask;
    sections.push(`## Your Current Task

**Title:** ${task.title}
**ID:** ${task.id}
**Status:** ${task.status}
**Priority:** ${task.priority}
**Size:** ${task.size}

${task.description || 'No description provided.'}

${task.acceptance_criteria && task.acceptance_criteria.length > 0 ? `### Acceptance Criteria
${task.acceptance_criteria.map(c => `- [ ] ${c}`).join('\n')}
` : ''}
${task.context ? `### Additional Context
${task.context}
` : ''}
${task.assigned_to ? `**Assigned to:** ${task.assigned_to}` : ''}
`);
  }

  // Workflow position
  sections.push(`## Workflow Position

${context.workflowPosition}
`);

  // Recent work (for QA and subsequent agents)
  if (context.recentWork.length > 0) {
    sections.push(`## Recent Work (for context)

${context.recentWork.map(work => {
  const filesStr = work.filesChanged.length > 0
    ? `\n  Files: ${work.filesChanged.slice(0, 5).join(', ')}${work.filesChanged.length > 5 ? ` (+${work.filesChanged.length - 5} more)` : ''}`
    : '';
  return `- **${work.task.title}** (${work.task.status})
  ${work.summary || 'No summary'}${filesStr}`;
}).join('\n\n')}
`);
  }

  // Pending handoffs
  if (context.pendingHandoffs.length > 0) {
    sections.push(`## Pending Handoffs For You

${context.pendingHandoffs.map(h => `### ${h.title}
**From:** ${h.from_agent} | **Priority:** ${h.priority} | **Type:** ${h.type}

${h.content}
`).join('\n')}
`);
  }

  return sections.join('\n');
}
