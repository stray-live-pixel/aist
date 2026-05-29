import { buildAgentSystemPrompt } from '../systemPrompt';
import { getFileAgentInstructionSources } from './sources/getFileAgentInstructionSources';
import type { BuildFileAgentSystemPromptParams } from './types';

/**
 * Что это: собирает финальный system prompt для model request из файлов workspace.
 * Зачем нужно: именно эту строку daemon отправляет модели, поэтому сюда входят active preset, инструкции, роль и skills.
 */
export function buildFileAgentSystemPrompt(params: BuildFileAgentSystemPromptParams): string {
  return buildAgentSystemPrompt({
    language: params.language,
    instructionSources: getFileAgentInstructionSources({
      workspaceRoot: params.workspaceRoot,
      homeDir: params.homeDir,
      skills: params.skills
    }),
    skills: params.skills
  });
}
