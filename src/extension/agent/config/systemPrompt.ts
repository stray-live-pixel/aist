import {
  buildFileAgentSystemPrompt,
  getFileAgentInstructionSources
} from '../../../core/features/system-prompt/filePromptConfig';
import type { AgentInstructionSource } from '../../../core/features/system-prompt/systemPrompt';
import { getWorkspaceFolder } from '../../shared/workspace';
import { getAgentSkills } from '../../skills/skills';
import { getAgentLanguage } from './settings';

export type ExtensionSystemPromptParams = {
  workspaceRoot?: string;
  homeDir?: string;
};

/**
 * Что это: собирает источники инструкций ровно тем же builder-ом, который использует daemon.
 * Зачем нужно: webview preview должен показывать пользователю те же правила, которые реально уйдут модели.
 */
export function getAgentInstructionSources(params: ExtensionSystemPromptParams = {}): AgentInstructionSource[] {
  const skills = getAgentSkills().map(({ id, label, description }) => ({ id, label, description }));

  return getFileAgentInstructionSources({
    workspaceRoot: params.workspaceRoot || getWorkspaceFolder().uri.fsPath,
    homeDir: params.homeDir,
    skills
  });
}

/**
 * Что это: собирает актуальный system prompt для preview в UI через общий файловый builder.
 * Зачем нужно: пользователь видит в webview тот же prompt-контракт, который daemon отправляет в model request.
 */
export function buildAgentSystemPrompt(params: ExtensionSystemPromptParams = {}): string {
  const skills = getAgentSkills().map(({ id, label, description }) => ({ id, label, description }));

  return buildFileAgentSystemPrompt({
    workspaceRoot: params.workspaceRoot || getWorkspaceFolder().uri.fsPath,
    homeDir: params.homeDir,
    language: getAgentLanguage(),
    skills
  });
}
