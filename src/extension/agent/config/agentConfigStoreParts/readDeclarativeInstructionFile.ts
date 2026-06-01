import fs from 'node:fs';
import path from 'node:path';

import { type AgentInstructionSource } from '../../../../core/features/system-prompt/systemPrompt';
import { getWorkspaceFolder } from '../../../shared/workspace';
import { DECLARATIVE_INSTRUCTION_FILES } from './DECLARATIVE_INSTRUCTION_FILES';

export function readDeclarativeInstructionFile(
  definition: (typeof DECLARATIVE_INSTRUCTION_FILES)[number]
): AgentInstructionSource | undefined {
  try {
    const filePath = path.join(getWorkspaceFolder().uri.fsPath, definition.path);
    if (!fs.existsSync(filePath)) return undefined;

    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content
      ? {
          id: definition.path,
          title: definition.title,
          content,
          priority: definition.priority,
          kind: 'declarative',
          source: definition.path
        }
      : undefined;
  } catch {
    return undefined;
  }
}
