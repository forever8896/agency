// Office layout constants and configuration

import type { AgentStatus } from '../../types';

// Status colors for agent visualization
export const STATUS_COLORS: Record<AgentStatus, string> = {
  OFFLINE: '#6b7280',  // Gray
  IDLE:    '#22c55e',  // Green
  WORKING: '#eab308',  // Yellow/Amber
  PAUSED:  '#f97316',  // Orange
  BLOCKED: '#ef4444',  // Red
};

// Priority colors for tasks
export const PRIORITY_COLORS: Record<string, string> = {
  P0: '#ef4444',  // Red - Critical
  P1: '#f97316',  // Orange - High
  P2: '#3b82f6',  // Blue - Medium
  P3: '#6b7280',  // Gray - Low
};

// Agent desk positions in 3D space [x, y, z]
export const AGENT_POSITIONS: Record<string, [number, number, number]> = {
  'product-owner': [-5, 0, 3],
  'tech-lead':     [-3, 0, 3],
  'dev-alpha':     [-2, 0, -2],
  'dev-beta':      [0, 0, -2],
  'dev-gamma':     [2, 0, -2],
  'qa':            [5, 0, -2],
  'reviewer':      [0, 0, 2],
  'devops':        [5, 0, 3],
};

// Zone definitions for the office layout
export interface Zone {
  id: string;
  name: string;
  position: [number, number, number];
  size: [number, number]; // width, depth
  color: string;
}

export const ZONES: Zone[] = [
  { id: 'inbox', name: 'Inbox', position: [-6, 0, -3], size: [2, 2], color: '#374151' },
  { id: 'dev', name: 'Development', position: [0, 0, -2], size: [6, 2], color: '#1e40af' },
  { id: 'qa', name: 'QA', position: [5, 0, -2], size: [2, 2], color: '#6d28d9' },
  { id: 'management', name: 'Management', position: [-4, 0, 3], size: [3, 2], color: '#b45309' },
  { id: 'review', name: 'Review', position: [0, 0, 2], size: [3, 2], color: '#047857' },
  { id: 'devops', name: 'DevOps', position: [5, 0, 3], size: [2, 2], color: '#b91c1c' },
  { id: 'done', name: 'Done', position: [0, 0, 5], size: [3, 1.5], color: '#065f46' },
];

// Task zone positions for inbox stacking
export const INBOX_POSITION: [number, number, number] = [-6, 0.5, -3];
export const READY_POOL_POSITION: [number, number, number] = [-4, 0.5, 0];
export const DONE_POSITION: [number, number, number] = [0, 0.5, 5];

// Camera settings for isometric view
export const CAMERA_POSITION: [number, number, number] = [12, 18, 12];
export const CAMERA_ZOOM = 35;

// Lighting
export const AMBIENT_LIGHT_INTENSITY = 0.4;
export const DIRECTIONAL_LIGHT_INTENSITY = 0.8;
export const DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [10, 20, 10];

// Floor
export const FLOOR_SIZE = 20;
export const FLOOR_COLOR = '#0a0a0f';
export const GRID_COLOR = '#1a1a24';
