import * as vscode from 'vscode';

import { getErrorMessage } from '../../../shared/errors';
import { addAgentSkill, deleteAgentSkill, updateAgentSkill } from '../../../skills/skills';
import type { WebviewMessage } from '../../types';
import type { AgentWebviewMessageDeps } from './types';

type SkillMessage = Extract<WebviewMessage, { type: 'addSkill' } | { type: 'updateSkill' } | { type: 'deleteSkill' }>;

export function isSkillMessage(message: WebviewMessage): message is SkillMessage {
  return message.type === 'addSkill' || message.type === 'updateSkill' || message.type === 'deleteSkill';
}

/**
 * Обрабатывает CRUD пользовательских skills из webview.
 *
 * Skills выполняются как внешние команды, поэтому ошибки сохранения обязательно
 * логируются и показываются пользователю. После каждой операции state
 * пересылается заново, чтобы UI увидел актуальный список skills и permissions.
 */
export async function handleWebviewSkillMessage(message: SkillMessage, deps: AgentWebviewMessageDeps): Promise<void> {
  switch (message.type) {
    case 'addSkill':
      await addSkill(message, deps);
      deps.sendState();
      return;
    case 'updateSkill':
      await updateSkill(message, deps);
      deps.sendState();
      return;
    case 'deleteSkill':
      await removeSkill(message.skillId, deps);
      deps.sendState();
      return;
  }
}

async function addSkill(
  message: Extract<SkillMessage, { type: 'addSkill' }>,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  try {
    const skill = await addAgentSkill({
      label: message.label,
      description: message.description,
      command: message.command,
      permission: message.permission
    });
    deps.logger.info('Agent skill added', { id: skill.id, label: skill.label, permission: skill.permission });
  } catch (error) {
    deps.logger.error('Failed to add agent skill', error);
    vscode.window.showErrorMessage(`aist: failed to add skill — ${getErrorMessage(error)}`);
  }
}

async function updateSkill(
  message: Extract<SkillMessage, { type: 'updateSkill' }>,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  try {
    const updated = await updateAgentSkill(message.skillId, {
      label: message.label,
      description: message.description,
      command: message.command,
      permission: message.permission
    });
    deps.logger.info('Agent skill update attempted', { skillId: message.skillId, updated });
  } catch (error) {
    deps.logger.error('Failed to update agent skill', error);
    vscode.window.showErrorMessage(`aist: failed to update skill — ${getErrorMessage(error)}`);
  }
}

async function removeSkill(skillId: string, deps: AgentWebviewMessageDeps): Promise<void> {
  try {
    const deleted = await deleteAgentSkill(skillId);
    deps.logger.info('Agent skill delete attempted', { skillId, deleted });
  } catch (error) {
    deps.logger.error('Failed to delete agent skill', error);
    vscode.window.showErrorMessage(`aist: failed to delete skill — ${getErrorMessage(error)}`);
  }
}
