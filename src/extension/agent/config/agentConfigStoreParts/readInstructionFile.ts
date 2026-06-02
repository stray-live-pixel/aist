import fs from 'node:fs';
import path from 'node:path';

import { type AgentInstructionSource } from '../../../../core/features/system-prompt/systemPrompt';
import { getWorkspaceFolder } from '../../../shared/workspace';

export function readInstructionFile(fileName: string, priority: number): AgentInstructionSource | undefined {
  try {
    const filePath = path.join(getWorkspaceFolder().uri.fsPath, fileName);
    if (!fs.existsSync(filePath)) return undefined;

    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content ? { id: fileName, title: fileName, content, priority, kind: 'file', source: fileName } : undefined;
  } catch {
    return undefined;
  }
}
