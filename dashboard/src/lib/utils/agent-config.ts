export const AGENT_CONFIG: Record<string, { emoji: string; color: string; label: string; short: string }> = {
	'product-owner': {
		emoji: '🎯',
		color: '#9333ea',
		label: 'Product Owner',
		short: 'PO'
	},
	'tech-lead': {
		emoji: '🏗️',
		color: '#3b82f6',
		label: 'Tech Lead',
		short: 'TL'
	},
	'dev-alpha': {
		emoji: '⚡',
		color: '#22c55e',
		label: 'Dev Alpha',
		short: 'α'
	},
	'dev-beta': {
		emoji: '🔧',
		color: '#22c55e',
		label: 'Dev Beta',
		short: 'β'
	},
	'dev-gamma': {
		emoji: '🛠️',
		color: '#22c55e',
		label: 'Dev Gamma',
		short: 'γ'
	},
	'qa': {
		emoji: '🔍',
		color: '#eab308',
		label: 'QA',
		short: 'QA'
	},
	'reviewer': {
		emoji: '📝',
		color: '#d946ef',
		label: 'Reviewer',
		short: 'REV'
	},
	'devops': {
		emoji: '🚀',
		color: '#06b6d4',
		label: 'DevOps',
		short: 'OPS'
	}
};

export const STATUS_CONFIG: Record<string, { color: string; bgColor: string }> = {
	'Idle': { color: '#6b7280', bgColor: '#f3f4f6' },
	'Working': { color: '#22c55e', bgColor: '#dcfce7' },
	'Blocked': { color: '#ef4444', bgColor: '#fef2f2' }
};

export const COLUMN_CONFIG: Record<string, { color: string; bgColor: string; icon: string }> = {
	'READY': { color: '#6366f1', bgColor: '#eef2ff', icon: '📋' },
	'IN_PROGRESS': { color: '#f59e0b', bgColor: '#fffbeb', icon: '🔨' },
	'DONE': { color: '#22c55e', bgColor: '#f0fdf4', icon: '✅' },
	'QA_TESTING': { color: '#eab308', bgColor: '#fefce8', icon: '🔍' },
	'QA_PASSED': { color: '#84cc16', bgColor: '#f7fee7', icon: '✓' },
	'QA_FAILED': { color: '#ef4444', bgColor: '#fef2f2', icon: '✗' },
	'REVIEWING': { color: '#a855f7', bgColor: '#faf5ff', icon: '📖' },
	'REVIEWED': { color: '#8b5cf6', bgColor: '#f5f3ff', icon: '✓' },
	'SHIPPED': { color: '#06b6d4', bgColor: '#ecfeff', icon: '🚀' }
};

export const PRIORITY_CONFIG: Record<number, { color: string; bgColor: string; label: string }> = {
	0: { color: '#dc2626', bgColor: '#fef2f2', label: 'P0' },
	1: { color: '#ea580c', bgColor: '#fff7ed', label: 'P1' },
	2: { color: '#ca8a04', bgColor: '#fefce8', label: 'P2' },
	3: { color: '#65a30d', bgColor: '#f7fee7', label: 'P3' }
};
