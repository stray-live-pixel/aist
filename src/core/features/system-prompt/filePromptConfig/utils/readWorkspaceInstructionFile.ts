import path from 'node:path';

import type { AgentInstructionSource } from '../../systemPrompt';
import { readTextFile } from './readTextFile';

/**
 * Что это: превращает AGENTS.md или CLAUDE.md в источник system prompt.
 * Зачем нужно: существующие проектные инструкции продолжают работать в daemon-запросах.
 */
export function readWorkspaceInstructionFile(params: {
  workspaceRoot: string;
  fileName: string;
  priority: number;
}): AgentInstructionSource | undefined {
  const content = readTextFile({ filePath: path.join(params.workspaceRoot, params.fileName) });

  return content
    ? {
        id: params.fileName,
        title: params.fileName,
        content,
        priority: params.priority,
        kind: 'file',
        source: params.fileName
      }
    : undefined;
}
