/**
 * Mock Finance Data Service
 * Generates realistic finance data for the finance dashboard
 * Supports manual refresh and configurable auto-refresh
 */

// ============================================
// Types
// ============================================

export interface HistoricalDataPoint {
	date: string;
	value: number;
}

export interface AssetClass {
	name: string;
	value: number;
	percentage: number;
	color: string;
}

export interface FinanceData {
	netWorth: {
		current: number;
		change: number;
		changePercent: number;
		historical: HistoricalDataPoint[];
	};
	assetAllocation: AssetClass[];
	lastUpdated: number;
}

// ============================================
// Constants
// ============================================

const ASSET_CLASSES = [
	{ name: 'Stocks', color: '#3b82f6', basePercent: 0.45 },
	{ name: 'Real Estate', color: '#10b981', basePercent: 0.30 },
	{ name: 'Crypto', color: '#8b5cf6', basePercent: 0.10 },
	{ name: 'Cash', color: '#f59e0b', basePercent: 0.10 },
	{ name: 'Other', color: '#6b7280', basePercent: 0.05 }
];

const BASE_NET_WORTH = 285000;
const VOLATILITY = 0.02; // 2% daily volatility

// ============================================
// Helper Functions
// ============================================

function randomNormal(mean: number, stdDev: number): number {
	// Box-Muller transform for normal distribution
	const u1 = Math.random();
	const u2 = Math.random();
	const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	return z * stdDev + mean;
}

function generateHistoricalData(days: number = 30): HistoricalDataPoint[] {
	const data: HistoricalDataPoint[] = [];
	const today = new Date();

	for (let i = days - 1; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		date.setHours(0, 0, 0, 0);

		// Random walk with drift (slight upward trend)
		const drift = 0.0003; // 0.03% daily upward trend
		const change = randomNormal(drift, VOLATILITY);
		const prevValue = i === days - 1 ? BASE_NET_WORTH * 0.85 : data[data.length - 1].value;
		const value = prevValue * (1 + change);

		data.push({
			date: date.toISOString().split('T')[0],
			value: Math.max(0, Math.round(value))
		});
	}

	return data;
}

function generateAssetAllocation(): AssetClass[] {
	// Add some random variation to base percentages
	const totalRandom = ASSET_CLASSES.reduce((sum, asset) => {
		return sum + Math.random() * 0.1 - 0.05;
	}, 0);

	const adjusted = ASSET_CLASSES.map((asset, i) => {
		const variation = Math.random() * 0.1 - 0.05;
		const percent = Math.max(0.01, asset.basePercent + variation - totalRandom / ASSET_CLASSES.length);
		return { ...asset, percentage: Math.round(percent * 1000) / 10 };
	});

	// Normalize to 100%
	const totalPercent = adjusted.reduce((sum, a) => sum + a.percentage, 0);
	const normalized = adjusted.map(asset => ({
		...asset,
		percentage: Math.round((asset.percentage / totalPercent) * 1000) / 10
	}));

	// Calculate values based on current net worth
	const historical = generateHistoricalData();
	const currentNetWorth = historical[historical.length - 1].value;

	return normalized.map(asset => ({
		...asset,
		value: Math.round((asset.percentage / 100) * currentNetWorth)
	})).sort((a, b) => b.percentage - a.percentage);
}

// ============================================
// Data Generation
// ============================================

function generateFinanceData(): FinanceData {
	const historical = generateHistoricalData(30);
	const current = historical[historical.length - 1].value;
	const previous = historical[historical.length - 2].value;
	const change = current - previous;
	const changePercent = (change / previous) * 100;

	return {
		netWorth: {
			current,
			change,
			changePercent: Math.round(changePercent * 100) / 100,
			historical
		},
		assetAllocation: generateAssetAllocation(),
		lastUpdated: Date.now()
	};
}

// ============================================
// Service
// ============================================

interface MockFinanceService {
	subscribe: (callback: (data: FinanceData) => void) => () => void;
	refresh: () => void;
	startAutoRefresh: (interval?: number) => void;
	stopAutoRefresh: () => void;
	getCurrentData: () => FinanceData;
}

let currentData: FinanceData = generateFinanceData();
let subscribers: Set<(data: FinanceData) => void> = new Set();
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

function notifySubscribers() {
	subscribers.forEach(callback => callback(currentData));
}

export const mockFinanceService: MockFinanceService = {
	subscribe(callback: (data: FinanceData) => void) {
		subscribers.add(callback);
		// Immediately send current data
		callback(currentData);

		// Return unsubscribe function
		return () => {
			subscribers.delete(callback);
		};
	},

	refresh() {
		currentData = generateFinanceData();
		notifySubscribers();
	},

	startAutoRefresh(interval: number = 30000) {
		if (autoRefreshTimer) {
			this.stopAutoRefresh();
		}
		autoRefreshTimer = setInterval(() => {
			this.refresh();
		}, interval);
	},

	stopAutoRefresh() {
		if (autoRefreshTimer) {
			clearInterval(autoRefreshTimer);
			autoRefreshTimer = null;
		}
	},

	getCurrentData() {
		return currentData;
	}
};

// ============================================
// Utility Functions
// ============================================

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(value);
}

export function formatPercent(value: number, showSign: boolean = true): string {
	const sign = showSign && value > 0 ? '+' : '';
	return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
