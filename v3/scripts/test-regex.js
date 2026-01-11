import { readFileSync } from 'fs';
import { join } from 'path';
const content = readFileSync(join(process.cwd(), '../agency/data/backlog.md'), 'utf-8');
const taskRegex = /^## (READY|IN_PROGRESS|DONE|QA_TESTING|QA_PASSED|QA_FAILED|REVIEWING|REVIEWED|SHIPPED):\s*\[(P[0-3])\]\s*(.+?)(?:\s+@(\S+))?$/gm;
let match;
let count = 0;
while ((match = taskRegex.exec(content)) !== null) {
    count++;
    console.log(`[${match[1]}] [${match[2]}] ${match[3].slice(0, 50)}... @${match[4] || 'none'}`);
    if (count > 15) {
        console.log('... (truncated)');
        break;
    }
}
console.log(`\nTotal matches found: ${count}`);
