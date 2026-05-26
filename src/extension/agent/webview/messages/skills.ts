import * as vscode from 'vscode';

import { getErrorMessage } from '../../../shared/errors';
import { t } from '../../../shared/i18n';
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
      await removeSkill(message.skillId, message.scope || 'local', deps);
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
      scope: message.scope || 'local',
      label: message.label,
      description: message.description,
      command: message.command,
      permission: message.permission
    });
    deps.logger.info('Agent skill added', { id: skill.id, label: skill.label, permission: skill.permission });
  } catch (error) {
    deps.logger.error('Failed to add agent skill', error);
    vscode.window.showErrorMessage(t('error.addSkill', { error: getErrorMessage(error) }));
  }
}

async function updateSkill(
  message: Extract<SkillMessage, { type: 'updateSkill' }>,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  try {
    const updated = await updateAgentSkill(
      message.skillId,
      {
        label: message.label,
        description: message.description,
        command: message.command,
        permission: message.permission
      },
      message.scope || 'local'
    );
    deps.logger.info('Agent skill update attempted', { skillId: message.skillId, updated });
  } catch (error) {
    deps.logger.error('Failed to update agent skill', error);
    vscode.window.showErrorMessage(t('error.updateSkill', { error: getErrorMessage(error) }));
  }
}

async function removeSkill(skillId: string, scope: 'global' | 'local', deps: AgentWebviewMessageDeps): Promise<void> {
  try {
    const deleted = await deleteAgentSkill(skillId, scope);
    deps.logger.info('Agent skill delete attempted', { skillId, scope, deleted });
  } catch (error) {
    deps.logger.error('Failed to delete agent skill', error);
    vscode.window.showErrorMessage(t('error.deleteSkill', { error: getErrorMessage(error) }));
  }
}
