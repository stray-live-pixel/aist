import type { AgentInstructionSource } from '../../systemPrompt';
import { DECLARATIVE_INSTRUCTION_FILES } from '../utils/declarativeInstructionFiles';
import { readDeclarativeInstructionFile } from '../utils/readDeclarativeInstructionFile';
import { readWorkspaceInstructionFile } from '../utils/readWorkspaceInstructionFile';

/**
 * Что это: собирает проектные инструкции из файлов рядом с workspace.
 * Зачем нужно: модель получает правила из AGENTS.md, CLAUDE.md и declarative storage в одном предсказуемом порядке.
 */
export function getExternalInstructionSources(params: { workspaceRoot: string }): AgentInstructionSource[] {
  return [
    readWorkspaceInstructionFile({ workspaceRoot: params.workspaceRoot, fileName: 'AGENTS.md', priority: 20 }),
    readWorkspaceInstructionFile({ workspaceRoot: params.workspaceRoot, fileName: 'CLAUDE.md', priority: 30 }),
    ...DECLARATIVE_INSTRUCTION_FILES.map((definition) =>
      readDeclarativeInstructionFile({ workspaceRoot: params.workspaceRoot, definition })
    )
  ].filter((source): source is AgentInstructionSource => Boolean(source));
}
