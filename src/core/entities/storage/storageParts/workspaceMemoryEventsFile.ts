import path from 'node:path';

import { workspaceAistRoot } from './workspaceAistRoot';

export function workspaceMemoryEventsFile(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'memory-events.jsonl');
}
