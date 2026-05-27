import { getAgentSkills } from '../../../skills/skills';
import {
  getDisabledProjectToolIds,
  setProjectToolEnabled,
  setToolPermission,
  setToolPermissionPreset
} from '../../../tools/permissions';
import { getAgentToolRegistry } from '../../runtime/toolRegistry';
import type { WebviewMessage } from '../../types';
import type { AgentWebviewMessageDeps } from './types';

type PermissionMessage = Extract<
  WebviewMessage,
  | { type: 'setToolPermission' }
  | { type: 'setToolPermissionPreset' }
  | { type: 'setProjectToolEnabled' }
  | { type: 'resolveToolCall' }
>;

export function isPermissionMessage(message: WebviewMessage): message is PermissionMessage {
  return (
    message.type === 'setToolPermission' ||
    message.type === 'setToolPermissionPreset' ||
    message.type === 'setProjectToolEnabled' ||
    message.type === 'resolveToolCall'
  );
}

/**
 * Обрабатывает permissions для tools и ответы на approval prompt.
 *
 * Ответ approve/deny уходит в активный AgentRun без обновления настроек, а
 * изменение preset/tool permission сразу пересылает state, чтобы UI отразил
 * новый режим подтверждений.
 */
export async function handleWebviewPermissionMessage(
  message: PermissionMessage,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  switch (message.type) {
    case 'setToolPermission':
      await setToolPermission(message.toolName, message.permission);
      deps.sendState();
      return;
    case 'setToolPermissionPreset':
      await applyPermissionPreset(message.presetId, deps);
      deps.sendState();
      return;
    case 'setProjectToolEnabled':
      await setProjectToolEnabled(message.toolId, message.enabled);
      await getAgentToolRegistry().refresh({
        skills: getAgentSkills(),
        disabledProjectToolIds: getDisabledProjectToolIds()
      });
      deps.sendState();
      return;
    case 'resolveToolCall':
      deps.resolveToolCall(message.messageId, toApprovalDecision(message));
      return;
  }
}

/**
 * UI отправляет продуктовые действия кнопок, а runtime нужен компактный объект решения.
 * Комментарий прикладывается к любому решению и дальше становится userApprovalComment в tool result.
 */
function toApprovalDecision(message: Extract<PermissionMessage, { type: 'resolveToolCall' }>) {
  return {
    approved: message.decision === 'approve',
    continueAfterDeny: message.decision === 'deny-continue',
    comment: message.comment?.trim() || undefined,
    rememberGlobal: message.rememberGlobal?.trim() || undefined,
    rememberProject: message.rememberProject?.trim() || undefined
  };
}

async function applyPermissionPreset(presetId: string, deps: AgentWebviewMessageDeps): Promise<void> {
  const applied = await setToolPermissionPreset(presetId);
  if (!applied) {
    deps.logger.info('Ignoring unknown tool permission preset', { presetId });
  }
}
