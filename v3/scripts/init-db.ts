#!/usr/bin/env tsx
// Agency v3 - Database Initialization Script

import { initializeDatabase, closeDatabase } from '../src/db/database.js';

console.log('Initializing Agency v3 database...');

try {
  initializeDatabase();
  console.log('Database initialized successfully!');
  console.log('Tables created:');
  console.log('  - tasks');
  console.log('  - agents');
  console.log('  - agent_sessions');
  console.log('  - messages');
  console.log('  - handoffs');
  console.log('  - events');
  console.log('');
  console.log('Views created:');
  console.log('  - v_active_work');
  console.log('  - v_backlog_summary');
  console.log('  - v_agent_workload');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
