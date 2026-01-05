import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { Task, TaskStatus, BacklogState, AgentStatus, AgentStatusType, Handoff } from '../types';

const VALID_STATUSES: TaskStatus[] = [
	'READY', 'IN_PROGRESS', 'DONE', 'QA_TESTING',
	'QA_PASSED', 'QA_FAILED', 'REVIEWING', 'REVIEWED', 'SHIPPED'
];

export async function parseBacklog(filePath: string): Promise<BacklogState> {
	const columns: Partial<Record<TaskStatus, Task[]>> = {};

	// Initialize all columns
	for (const status of VALID_STATUSES) {
		columns[status] = [];
	}

	if (!existsSync(filePath)) {
		return { columns };
	}

	const content = await readFile(filePath, 'utf-8');
	const lines = content.split('\n');

	let currentTask: Partial<Task> | null = null;

	for (const line of lines) {
		// Match task header: ## STATUS: [P1] Title @agent-name
		const headerMatch = line.match(/^## (READY|IN_PROGRESS|DONE|QA_TESTING|QA_PASSED|QA_FAILED|REVIEWING|REVIEWED|SHIPPED):\s*(?:\[P(\d)\])?\s*(.+?)(?:\s+@(\S+))?$/);

		if (headerMatch) {
			// Save previous task if exists
			if (currentTask && currentTask.status && currentTask.title) {
				const status = currentTask.status as TaskStatus;
				columns[status]?.push(currentTask as Task);
			}

			const [, status, priority, title, assignee] = headerMatch;
			currentTask = {
				id: `${status}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				status: status as TaskStatus,
				priority: priority ? parseInt(priority) : 2,
				title: title.trim(),
				assignee: assignee || 'unassigned'
			};
			continue;
		}

		// Parse metadata fields for current task
		if (currentTask) {
			const filesMatch = line.match(/^\*\*Files:\*\*\s*(.+)$/);
			if (filesMatch) {
				currentTask.files = filesMatch[1].split(',').map(f => f.trim());
				continue;
			}

			const summaryMatch = line.match(/^\*\*Summary:\*\*\s*(.+)$/);
			if (summaryMatch) {
				currentTask.summary = summaryMatch[1];
				continue;
			}

			const testedMatch = line.match(/^\*\*Tested:\*\*\s*(.+)$/);
			if (testedMatch) {
				currentTask.tested = testedMatch[1];
				continue;
			}
		}
	}

	// Don't forget the last task
	if (currentTask && currentTask.status && currentTask.title) {
		const status = currentTask.status as TaskStatus;
		columns[status]?.push(currentTask as Task);
	}

	return { columns };
}

export async function parseStandup(filePath: string): Promise<AgentStatus[]> {
	const agents: AgentStatus[] = [];

	if (!existsSync(filePath)) {
		return agents;
	}

	const content = await readFile(filePath, 'utf-8');
	const agentNames = ['product-owner', 'tech-lead', 'dev-alpha', 'dev-beta', 'dev-gamma', 'qa', 'reviewer', 'devops'];

	for (const name of agentNames) {
		const sectionRegex = new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
		const match = content.match(sectionRegex);

		if (match) {
			const section = match[1];

			const statusMatch = section.match(/\*\*Status:\*\*\s*(.+)/);
			const workingMatch = section.match(/\*\*Working on:\*\*\s*(.+)/);
			const completedMatch = section.match(/\*\*Completed:\*\*\s*(.+)/);
			const blockersMatch = section.match(/\*\*Blockers:\*\*\s*(.+)/);
			const nextMatch = section.match(/\*\*Next:\*\*\s*(.+)/);
			const updatedMatch = section.match(/\*Updated:\s*(.+?)\*/);

			const rawStatus = statusMatch?.[1] || 'Idle';
			let status: AgentStatusType = 'Idle';

			if (rawStatus.toUpperCase().includes('BLOCKED')) {
				status = 'Blocked';
			} else if (rawStatus !== 'Idle' && rawStatus !== '--') {
				status = 'Working';
			}

			agents.push({
				name,
				status,
				workingOn: workingMatch?.[1] || '--',
				completed: completedMatch?.[1] || '--',
				blockers: blockersMatch?.[1] || 'None',
				next: nextMatch?.[1] || '--',
				updated: updatedMatch?.[1] || '--'
			});
		} else {
			// Agent not in standup, add with default values
			agents.push({
				name,
				status: 'Idle',
				workingOn: '--',
				completed: '--',
				blockers: 'None',
				next: '--',
				updated: '--'
			});
		}
	}

	return agents;
}

export async function parseHandoffs(dirPath: string): Promise<Handoff[]> {
	const handoffs: Handoff[] = [];

	if (!existsSync(dirPath)) {
		return handoffs;
	}

	const files = await readdir(dirPath);

	for (const file of files) {
		if (!file.endsWith('.md') || file === '.gitkeep') continue;

		try {
			const content = await readFile(path.join(dirPath, file), 'utf-8');
			const titleMatch = content.match(/^# (.+)/m);
			const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);

			// Parse from/to from filename (e.g., "tl-to-dev-beta-topic.md")
			const filenameMatch = file.match(/^(\w+)-to-([\w-]+)/);

			let from = 'unknown';
			let to = 'unknown';

			if (filenameMatch) {
				from = filenameMatch[1] === 'tl' ? 'tech-lead' : filenameMatch[1];
				to = filenameMatch[2];
			}

			handoffs.push({
				id: file.replace('.md', ''),
				filename: file,
				title: titleMatch?.[1] || file.replace('.md', ''),
				from,
				to,
				date: dateMatch?.[1] || '',
				content
			});
		} catch (e) {
			// Skip files that can't be parsed
			console.error(`Error parsing handoff ${file}:`, e);
		}
	}

	return handoffs;
}
