import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Generate realistic mock finance data
function generateFinanceData() {
	const baseNetWorth = 125000;
	const randomVariation = (Math.random() - 0.5) * 2000;

	return {
		netWorth: Math.round(baseNetWorth + randomVariation),
		netWorthChange: Math.round((Math.random() - 0.3) * 5000),
		netWorthChangePercent: Number(((Math.random() - 0.3) * 5).toFixed(2)),
		assetAllocation: [
			{ assetClass: 'Stocks', value: 65000, percentage: 52, color: '#3b82f6' },
			{ assetClass: 'Real Estate', value: 40000, percentage: 32, color: '#10b981' },
			{ assetClass: 'Crypto', value: 12000, percentage: 9.6, color: '#8b5cf6' },
			{ assetClass: 'Cash', value: 8000, percentage: 6.4, color: '#f59e0b' }
		],
		lastUpdated: Date.now()
	};
}

export const GET: RequestHandler = async () => {
	try {
		const data = generateFinanceData();
		return json(data);
	} catch (e) {
		console.error('[API/finance/data] Error:', e);
		return json(
			{
				netWorth: 0,
				netWorthChange: 0,
				netWorthChangePercent: 0,
				assetAllocation: [],
				lastUpdated: Date.now()
			},
			{ status: 500 }
		);
	}
};
