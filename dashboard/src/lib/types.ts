export type TaskStatus =
	| 'READY'
	| 'IN_PROGRESS'
	| 'DONE'
	| 'QA_TESTING'
	| 'QA_PASSED'
	| 'QA_FAILED'
	| 'REVIEWING'
	| 'REVIEWED'
	| 'SHIPPED';

export interface Task {
	id: string;
	status: TaskStatus;
	priority: number;
	title: string;
	assignee: string;
	files?: string[];
	summary?: string;
	tested?: string;
}

export interface BacklogState {
	columns: Partial<Record<TaskStatus, Task[]>>;
}

export type AgentStatusType = 'Idle' | 'Working' | 'Blocked';

export interface AgentStatus {
	name: string;
	status: AgentStatusType;
	workingOn: string;
	completed: string;
	blockers: string;
	next: string;
	updated: string;
}

export interface Handoff {
	id: string;
	filename: string;
	title: string;
	from: string;
	to: string;
	date: string;
	content: string;
}

export interface DashboardState {
	backlog: BacklogState;
	agents: AgentStatus[];
	handoffs: Handoff[];
}

export interface WSMessage {
	type: 'initial' | 'update';
	data: DashboardState;
	timestamp?: number;
}
