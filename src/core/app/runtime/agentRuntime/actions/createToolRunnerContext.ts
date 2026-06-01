import type { ToolRunnerMutableContext } from '../../../../features/tool-execution/toolRunner';
import type { AgentRuntimeContext } from '../context';
import { appendMessage } from './appendMessage';
import { setActivity } from './setActivity';
import { throwIfStopped } from './throwIfStopped';

/**
 * Что это: создаёт context для безопасного tool runner.
 * Зачем нужно: tools могут добавлять сообщения, менять activity и план без доступа ко всему runtime.
 * Какую продуктовую проблему решает: tool execution остаётся управляемым и approval-aware.
 */
export function createToolRunnerContext({
  context,
  runId
}: {
  context: AgentRuntimeContext;
  runId: string;
}): ToolRunnerMutableContext {
  return {
    appendToolMessage: (chatId, message) => appendMessage({ context, runId, chatId, message }),
    updateToolMessage: (chatId, messageId, patch) =>
      context.deps.chatRepository.updateMessage(chatId, messageId, patch),
    setActivity: (chatId, activity, detail) => setActivity({ context, runId, chatId, activity, detail }),
    getActivePlan: (chatId) => context.deps.chatRepository.getActivePlan(chatId),
    setActivePlan: (chatId, activePlan) => context.deps.chatRepository.setActivePlan(chatId, activePlan),
    throwIfStopped: (run) => throwIfStopped({ run })
  };
}
