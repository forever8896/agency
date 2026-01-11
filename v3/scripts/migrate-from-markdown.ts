#!/usr/bin/env tsx
// Agency v3 - Migrate from Markdown to SQLite
// Parses existing backlog.md and imports tasks into the database

import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { v4 as uuid } from 'uuid';
import {
  initializeDatabase,
  closeDatabase,
  getDatabase,
  taskQueries,
  handoffQueries,
  eventQueries,
} from '../src/db/database.js';
import type { TaskStatus, Priority, CreateHandoffInput, HandoffType } from '../src/types/index.js';

const AGENCY_DATA_DIR = process.env.AGENCY_DATA_DIR || join(process.cwd(), '../agency/data');

interface ParsedTask {
  status: TaskStatus;
  priority: Priority;
  title: string;
  assignee: string | null;
  value: string | null;
  acceptance: string[];
  files: string[];
  summary: string | null;
  reviewRequired: boolean;
}

// Map markdown status headers to database status
const STATUS_MAP: Record<string, TaskStatus> = {
  'READY': 'READY',
  'IN_PROGRESS': 'IN_PROGRESS',
  'DONE': 'DONE',
  'QA_TESTING': 'QA_TESTING',
  'QA_PASSED': 'QA_PASSED',
  'QA_FAILED': 'QA_FAILED',
  'REVIEWING': 'REVIEWING',
  'REVIEWED': 'REVIEWED',
  'SHIPPED': 'SHIPPED',
};

function parseBacklog(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];

  // Match task headers: ## STATUS: [PRIORITY] Title @assignee
  // Priority is P0, P1, P2, or P3
  const taskRegex = /^## (READY|IN_PROGRESS|DONE|QA_TESTING|QA_PASSED|QA_FAILED|REVIEWING|REVIEWED|SHIPPED):\s*\[(P[0-3])\]\s*(.+?)(?:\s+@(\S+))?$/gm;

  let match;
  const matches: { index: number; status: string; priority: string; title: string; assignee: string | null }[] = [];

  while ((match = taskRegex.exec(content)) !== null) {
    matches.push({
      index: match.index,
      status: match[1],
      priority: match[2],
      title: match[3].trim(),
      assignee: match[4] || null,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = matches[i + 1]?.index || content.length;
    const taskContent = content.slice(current.index, nextIndex);

    // Parse task body
    const valueMatch = taskContent.match(/\*\*Value:\*\*\s*(.+?)(?=\n\*\*|$)/s);
    const acceptanceMatch = taskContent.match(/\*\*Acceptance:\*\*\s*([\s\S]+?)(?=\n\*\*|$)/);
    const filesMatch = taskContent.match(/\*\*Files:\*\*\s*(.+?)(?=\n|$)/);
    const summaryMatch = taskContent.match(/\*\*Summary:\*\*\s*([\s\S]+?)(?=\n\*\*|$)/);
    const reviewMatch = taskContent.match(/Review Required:\s*yes/i);

    // Parse acceptance criteria (list items)
    let acceptance: string[] = [];
    if (acceptanceMatch) {
      acceptance = acceptanceMatch[1]
        .split('\n')
        .map(line => line.replace(/^[\s-*]+/, '').trim())
        .filter(line => line.length > 0);
    }

    // Parse files list
    let files: string[] = [];
    if (filesMatch) {
      files = filesMatch[1]
        .split(/[,\s]+/)
        .map(f => f.trim())
        .filter(f => f.length > 0);
    }

    tasks.push({
      status: STATUS_MAP[current.status] || 'READY',
      priority: current.priority as Priority,
      title: current.title,
      assignee: current.assignee,
      value: valueMatch ? valueMatch[1].trim() : null,
      acceptance,
      files,
      summary: summaryMatch ? summaryMatch[1].trim() : null,
      reviewRequired: Boolean(reviewMatch),
    });
  }

  return tasks;
}

function parseHandoffs(handoffsDir: string): CreateHandoffInput[] {
  const handoffs: CreateHandoffInput[] = [];

  try {
    const files = readdirSync(handoffsDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const content = readFileSync(join(handoffsDir, file), 'utf-8');
      const name = basename(file, '.md');

      // Try to extract from/to from filename (e.g., tl-to-dev-beta-topic.md)
      const routeMatch = name.match(/^(\w+)-to-(\w+)-(.+)$/);

      // Try to extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : name;

      // Determine type from filename or content
      let type: HandoffType = 'general';
      if (name.includes('bug')) type = 'bug-report';
      else if (name.includes('design')) type = 'design-doc';
      else if (name.includes('review')) type = 'review-request';
      else if (name.includes('blocker') || name.includes('blocked')) type = 'blocker';
      else if (name.includes('discovery')) type = 'design-doc';

      handoffs.push({
        from_agent: routeMatch ? routeMatch[1] : 'unknown',
        to_agent: routeMatch ? routeMatch[2] : undefined,
        type,
        title,
        content: content.slice(0, 5000), // Limit content size
        priority: 'normal',
      });
    }
  } catch (error) {
    console.warn('Could not read handoffs directory:', error);
  }

  return handoffs;
}

async function main() {
  console.log('Agency v3 - Markdown to SQLite Migration');
  console.log('=========================================\n');
  console.log(`Data directory: ${AGENCY_DATA_DIR}\n`);

  // Initialize database
  console.log('Initializing database...');
  initializeDatabase();

  const db = getDatabase();

  // Check if tasks already exist
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  if (existingCount.count > 0) {
    console.log(`\nWarning: Database already contains ${existingCount.count} tasks.`);
    console.log('Skipping task migration to avoid duplicates.');
    console.log('To re-migrate, delete data/agency.db and run again.\n');
  } else {
    // Parse and import backlog
    const backlogPath = join(AGENCY_DATA_DIR, 'backlog.md');
    console.log(`Reading backlog from: ${backlogPath}`);

    try {
      const backlogContent = readFileSync(backlogPath, 'utf-8');
      const tasks = parseBacklog(backlogContent);

      console.log(`Found ${tasks.length} tasks to import\n`);

      // Import tasks
      let imported = 0;
      let skipped = 0;

      for (const task of tasks) {
        try {
          const created = taskQueries.create({
            title: task.title,
            description: task.value || undefined,
            priority: task.priority,
            value_statement: task.value || undefined,
            acceptance_criteria: task.acceptance,
            review_required: task.reviewRequired,
          });

          // Update status and assignment
          if (task.status !== 'INBOX') {
            db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(task.status, created.id);
          }

          if (task.assignee) {
            db.prepare('UPDATE tasks SET assigned_to = ?, claimed_at = ? WHERE id = ?')
              .run(task.assignee, Date.now(), created.id);
          }

          if (task.summary) {
            db.prepare('UPDATE tasks SET summary = ? WHERE id = ?').run(task.summary, created.id);
          }

          if (task.files.length > 0) {
            db.prepare('UPDATE tasks SET files_changed = ? WHERE id = ?')
              .run(JSON.stringify(task.files), created.id);
          }

          imported++;
          console.log(`  [${task.status}] ${task.title.slice(0, 60)}...`);
        } catch (error) {
          console.error(`  Failed to import: ${task.title}`, error);
          skipped++;
        }
      }

      console.log(`\nTasks: ${imported} imported, ${skipped} skipped`);

      // Log migration event
      eventQueries.create('system.startup', {
        message: `Migrated ${imported} tasks from markdown`,
        data: { imported, skipped, source: backlogPath },
      });
    } catch (error) {
      console.error('Failed to read backlog:', error);
    }
  }

  // Parse and import handoffs
  const handoffsDir = join(AGENCY_DATA_DIR, 'handoffs');
  console.log(`\nReading handoffs from: ${handoffsDir}`);

  const existingHandoffs = db.prepare('SELECT COUNT(*) as count FROM handoffs').get() as { count: number };
  if (existingHandoffs.count > 0) {
    console.log(`Skipping handoff migration (${existingHandoffs.count} already exist)`);
  } else {
    try {
      const handoffs = parseHandoffs(handoffsDir);
      console.log(`Found ${handoffs.length} handoffs to import\n`);

      let handoffImported = 0;
      for (const handoff of handoffs) {
        try {
          handoffQueries.create(handoff);
          handoffImported++;
          console.log(`  [${handoff.type}] ${handoff.title.slice(0, 50)}...`);
        } catch (error) {
          console.error(`  Failed to import handoff: ${handoff.title}`, error);
        }
      }

      console.log(`\nHandoffs: ${handoffImported} imported`);
    } catch (error) {
      console.error('Failed to read handoffs:', error);
    }
  }

  // Summary
  console.log('\n=========================================');
  console.log('Migration complete!\n');

  const summary = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM tasks
    GROUP BY status
    ORDER BY CASE status
      WHEN 'INBOX' THEN 1
      WHEN 'READY' THEN 2
      WHEN 'IN_PROGRESS' THEN 3
      WHEN 'DONE' THEN 4
      WHEN 'QA_TESTING' THEN 5
      WHEN 'QA_PASSED' THEN 6
      WHEN 'SHIPPED' THEN 7
    END
  `).all() as { status: string; count: number }[];

  console.log('Task Summary:');
  for (const row of summary) {
    console.log(`  ${row.status}: ${row.count}`);
  }

  const totalHandoffs = db.prepare('SELECT COUNT(*) as count FROM handoffs').get() as { count: number };
  console.log(`\nTotal Handoffs: ${totalHandoffs.count}`);

  closeDatabase();
}

main().catch(console.error);
