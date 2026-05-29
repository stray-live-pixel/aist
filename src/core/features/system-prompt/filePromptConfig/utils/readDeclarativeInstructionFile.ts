import path from 'node:path';

import type { AgentInstructionSource } from '../../systemPrompt';
import type { DECLARATIVE_INSTRUCTION_FILES } from './declarativeInstructionFiles';
import { readTextFile } from './readTextFile';

/**
 * Что это: превращает `.aist-agent/...` declarative-файл в источник system prompt.
 * Зачем нужно: проектные правила из storage должны доходить до модели, а не только отображаться в UI.
 */
export function readDeclarativeInstructionFile(params: {
  workspaceRoot: string;
  definition: (typeof DECLARATIVE_INSTRUCTION_FILES)[number];
}): AgentInstructionSource | undefined {
  const content = readTextFile({ filePath: path.join(params.workspaceRoot, params.definition.path) });

  return content
    ? {
        id: params.definition.path,
        title: params.definition.title,
        content,
        priority: params.definition.priority,
        kind: 'declarative',
        source: params.definition.path
      }
    : undefined;
}
